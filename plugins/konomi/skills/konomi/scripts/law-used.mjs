#!/usr/bin/env node
// 指摘に使った法則の ID、または作業中の気づきを、保管層に 1 行ずつ記録する。
//   node law-used.mjs W-03 M-12
//   node law-used.mjs --note "何が起きたか。どの失敗を防ぎたいか"
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const dir = process.env.KONOMI_HOME || path.join(os.homedir(), ".claude", "konomi");
const file = path.join(dir, "usage.jsonl");
const base = { at: new Date().toISOString(), repo: path.basename(process.env.CLAUDE_PROJECT_DIR || process.cwd()) };
const lines = [];
const i = args.indexOf("--note");
if (i >= 0) {
  const note = args.slice(i + 1).join(" ").trim();
  if (!note) { console.error("--note のあとに内容を書いてください"); process.exit(2); }
  lines.push({ ...base, note });
} else {
  const ids = args.filter((a) => /^[A-Z]{1,2}-\d+$/.test(a));
  const bad = args.filter((a) => !/^[A-Z]{1,2}-\d+$/.test(a));
  if (bad.length) console.error(`法則の ID ではないので無視しました: ${bad.join(", ")}`);
  if (!ids.length) { console.error("法則の ID（例: W-03）か --note を指定してください"); process.exit(2); }
  for (const law of ids) lines.push({ ...base, law });
}
fs.mkdirSync(dir, { recursive: true });
fs.appendFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
console.log(`${lines.length} 件を記録しました`);
