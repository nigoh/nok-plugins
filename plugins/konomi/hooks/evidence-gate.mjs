#!/usr/bin/env node
// konomi evidence-gate（Stop フック）
// .konomi/screens.yaml があるリポジトリでだけ働く。
// evidence/*-report.json が「無い・古い・不合格・未実行あり」のうちは、完了を止めて理由を返す。
// レポートは検査スクリプトが書くもの。このフックは中身を信じるのではなく、鮮度と状態を確かめる。
//
// 人が止めたいとき: 環境変数 KONOMI_GATE=off

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const SKIP = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", "evidence"]);
const allow = () => process.exit(0);
const block = (reasons) => {
  const reason =
    "konomi: まだ完了にできません。\n" +
    reasons.map((r) => `- ${r}`).join("\n") +
    "\n検査を実行し直すか、直せない理由を利用者に伝えて判断を仰いでください。レポートを手で書き換えてはいけません。";
  console.log(JSON.stringify({ decision: "block", reason }));
  process.exit(0);
};

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
} catch {}
if (process.env.KONOMI_GATE === "off") allow();
// 一度止めた直後にもう一度止めると抜けられなくなるので、2 回目は通す
if (input.stop_hook_active) allow();

const root = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const yamlPath = path.join(root, ".konomi", "screens.yaml");
if (!fs.existsSync(yamlPath)) allow(); // konomi を使っていないリポジトリ

function newestMtime(dir, newest = { t: 0, f: "" }) {
  if (!fs.existsSync(dir)) return newest;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) newestMtime(p, newest);
    else if (e.isFile()) {
      const t = fs.statSync(p).mtimeMs;
      if (t > newest.t) (newest.t = t), (newest.f = p);
    }
  }
  return newest;
}

// screens.yaml の sources を、YAML パーサーなしで拾う（フックは依存を持たない）
const yamlText = fs.readFileSync(yamlPath, "utf8");
const dirs = new Set();
for (const m of yamlText.matchAll(/^\s+(?:requirements|code|tests):\s*\[([^\]]*)\]/gm)) {
  for (const d of m[1].split(",")) {
    const v = d.trim().replace(/^["']|["']$/g, "");
    if (v) dirs.add(v);
  }
}
if (dirs.size === 0) dirs.add("src");

const newest = { t: fs.statSync(yamlPath).mtimeMs, f: yamlPath };
for (const d of dirs) newestMtime(path.join(root, d), newest);

let head = null;
try {
  head = execSync("git rev-parse HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {}

const evDir = path.join(root, "evidence");
const reports = fs.existsSync(evDir) ? fs.readdirSync(evDir).filter((f) => f.endsWith("-report.json")) : [];
const reasons = [];
if (!reports.includes("trace-report.json")) {
  reasons.push("evidence/trace-report.json がありません（trace-check を実行してください）");
}
for (const f of reports) {
  let r;
  try {
    r = JSON.parse(fs.readFileSync(path.join(evDir, f), "utf8"));
  } catch {
    reasons.push(`evidence/${f} を読めません`);
    continue;
  }
  const at = Date.parse(r.generatedAt ?? "");
  if (!Number.isFinite(at)) reasons.push(`evidence/${f} に実行時刻がありません`);
  else if (at + 1000 < newest.t) {
    reasons.push(`evidence/${f} が古いです（${path.relative(root, newest.f)} がレポートより後に変わっています）`);
  }
  if (head && r.commit && r.commit !== head) reasons.push(`evidence/${f} は別のコミットのものです`);
  if (r.status !== "pass") {
    const n = r.counts?.problems ?? r.problems?.length ?? "?";
    reasons.push(`evidence/${f} が不合格です（status: ${r.status ?? "なし"}、問題 ${n} 件）`);
  }
  const notRun = (r.checks ?? []).filter((c) => c.status === "not_run").length;
  if (notRun > 0) reasons.push(`evidence/${f} に未実行の検査が ${notRun} 件あります`);
}
if (reasons.length > 0) block(reasons);
allow();
