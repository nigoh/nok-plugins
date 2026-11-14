#!/usr/bin/env node
// 整理のときに使う。法則の数と上限、実在しない ID、記録が法則に入っている割合、使用回数を出す。
// 使い方：node scripts/laws-check.mjs   終了コード 0=問題なし／1=問題あり
// 法則 ID は laws/*.md の点検表の行（| ID | 確かめること | 確かめ方 | 正 |、または | ID | 確かめ方 | 正 |）と、
// 見出し「## 検査の表」の表（| 検査名 | 道具 | 守る法則 ID | 正 |）の両方から拾う。
// 元の記録は records/laws-sources.md（## ファイル名 ごとの | 法則 ID | 元 |、末尾に「法則にしなかった記録」）から読む。
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LIMIT = { "flow.md": 30, "visual.md": 30, "interaction.md": 25, "requirements.md": 18, "implementation.md": 36, "test.md": 16, "other-jobs.md": 33, default: 25 };
const MAX_LAW_CHARS = 80; // 「確かめること」の字数
const ROW = /^\| ([RWVIMTP]-\d+) \|(.*)\|\s*$/;
const THEORY_ID = /\b[A-Z]{1,2}-\d+\b/g, LAW_ID = /\b[RWVIMTP]-\d+\b/g, REC_ID = /[A-G]\d+-\d+/g;
const SKILL_LIMIT = 150;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".md") ? [path.join(d, e.name)] : []));
const read = (f) => fs.readFileSync(f, "utf8");

const records = new Map(); let recBytes = 0;
for (const f of walk(path.join(root, "records"))) {
  recBytes += fs.statSync(f).size;
  if (path.basename(f) === "laws-sources.md") continue;
  for (const m of read(f).matchAll(/^\| ([A-G]\d+-\d+) \|/gm)) records.set(m[1], path.basename(f));
}
// 対応表：ファイルごとの法則 ID → 元、末尾の「法則にしなかった記録」
const srcOf = new Map(); const excluded = new Set(); const srcFile = new Map(); const problems = [];
const sfile = path.join(root, "records", "laws-sources.md");
if (!fs.existsSync(sfile)) problems.push("records/laws-sources.md がありません");
else {
  let cur = null, ex = false;
  for (const l of read(sfile).split("\n")) {
    if (l.startsWith("## ")) { ex = l.startsWith("## 法則にしなかった記録"); cur = ex ? null : l.slice(3).trim(); continue; }
    if (ex) { for (const r of l.match(REC_ID) ?? []) excluded.add(r); continue; }
    const m = l.match(ROW); if (!m || !cur) continue;
    const src = m[2].trim().replace(/\s*$/, "");
    if (srcOf.has(m[1])) problems.push(`laws-sources.md: ${m[1]} が重複`);
    srcOf.set(m[1], src.replace(/\|\s*$/, "").trim()); srcFile.set(m[1], cur);
  }
}
// 「正」の欄が指す理論の ID（references/ の本と、法則の ID）
const known = new Set();
for (const f of walk(path.join(root, "references"))) for (const m of read(f).matchAll(THEORY_ID)) known.add(m[0]);
const lawFiles = fs.readdirSync(path.join(root, "laws")).filter((f) => f.endsWith(".md")).sort();
for (const f of lawFiles) for (const l of read(path.join(root, "laws", f)).split("\n")) { const m = l.match(ROW); if (m) known.add(m[1]); }
const usage = new Map(); let notes = 0;
const ufile = path.join(process.env.KONOMI_HOME || path.join(os.homedir(), ".claude", "konomi"), "usage.jsonl");
if (fs.existsSync(ufile)) for (const l of read(ufile).split("\n").filter(Boolean)) {
  try { const j = JSON.parse(l); if (j.law) usage.set(j.law, (usage.get(j.law) ?? 0) + 1); if (j.note) notes++; } catch {}
}

const lens = []; const used = new Map(); let total = 0; const seenLaw = new Set(); const rows = [];
const checkTheory = (f, id, theory) => { for (const t of theory.match(THEORY_ID) ?? []) if (!known.has(t)) problems.push(`${f}: ${id} の正 ${t} は理論にありません`); };
for (const f of lawFiles) {
  const text = read(path.join(root, "laws", f));
  const laws = []; let inCheck = false, nCheck = 0;
  for (const line of text.split("\n")) {
    if (line.startsWith("#")) { inCheck = line.startsWith("## 検査の表"); continue; }
    if (inCheck) { // | 検査名 | 道具 | 守る法則 ID | 正 |
      if (!line.startsWith("| ") || /^\| (検査名|---)/.test(line)) continue;
      const c = line.split("|").slice(1, -1).map((x) => x.trim());
      if (c.length !== 4) { problems.push(`${f}: 検査の表の列が ${c.length} 個（4 列：検査名｜道具｜守る法則 ID｜正）`); continue; }
      const ids = c[2].match(LAW_ID) ?? [];
      if (!c[0]) problems.push(`${f}: 検査の表に検査名が空の行`);
      if (!ids.length) problems.push(`${f}: 検査「${c[0]}」に守る法則 ID がありません`);
      if (!c[3]) problems.push(`${f}: 検査「${c[0]}」の正が空です`);
      nCheck++;
      for (const id of ids) { if (!laws.some((L) => L.id === id)) laws.push({ id, kind: "検査" }); checkTheory(f, id, c[3]); }
      continue;
    }
    const m = line.match(ROW); if (!m) continue;
    const cells = m[2].split("|").map((c) => c.trim());
    if (cells.length === 2) { // ID｜確かめ方｜正
      laws.push({ id: m[1], kind: "指す", how: cells[0], theory: cells[1] });
    } else if (cells.length === 3) { // ID｜確かめること｜確かめ方｜正
      laws.push({ id: m[1], kind: "本文", text: cells[0], how: cells[1], theory: cells[2] });
    } else problems.push(`${f}: ${m[1]} の列が ${cells.length + 1} 個（ID｜確かめること｜確かめ方｜正、または ID｜確かめ方｜正）`);
  }
  const limit = LIMIT[f] ?? LIMIT.default;
  if (laws.length > limit) problems.push(`${f}: 法則が ${laws.length} 個（上限 ${limit}）`);
  let cited = 0;
  for (const L of laws) {
    const { id } = L; total++;
    if (seenLaw.has(id)) problems.push(`${f}: 法則 ID ${id} が重複`); seenLaw.add(id);
    if (L.kind !== "検査") {
      if (L.kind === "本文") { if (L.text.length > MAX_LAW_CHARS) problems.push(`${f}: ${id} の確かめることが ${L.text.length} 字（上限 ${MAX_LAW_CHARS}）`); lens.push(L.text.length); }
      if (!L.how) problems.push(`${f}: ${id} に「確かめ方」がありません`);
      if (!L.theory) problems.push(`${f}: ${id} の「正」が空です（理論が無ければ「—」）`);
      checkTheory(f, id, L.theory);
    }
    const src = srcOf.get(id);
    if (src === undefined) { problems.push(`${f}: ${id} が records/laws-sources.md にありません`); continue; }
    if (srcFile.get(id) !== f) problems.push(`${f}: ${id} は laws-sources.md の ${srcFile.get(id)} の節にあります`);
    const ids = src.match(REC_ID) ?? [];
    if (ids.length === 0 && !/試作|整理/.test(src)) problems.push(`${f}: ${id} の元に記録の ID も試作・整理の出どころもありません`);
    for (const r of ids) {
      if (!records.has(r)) problems.push(`${f}: ${id} の元 ${r} は記録にありません`);
      else { cited++; (used.get(r) ?? used.set(r, []).get(r)).push(id); }
    }
  }
  const zero = laws.filter(({ id }) => !usage.has(id)).length;
  rows.push({ ファイル: f, 法則: laws.length, 上限: limit, 検査の表の行: nCheck, 元の記録: cited, バイト: Buffer.byteLength(text), 未使用: zero });
}
for (const id of srcOf.keys()) if (!seenLaw.has(id)) problems.push(`laws-sources.md: ${id} は点検表にありません`);
for (const r of excluded) if (!records.has(r)) problems.push(`laws-sources.md: 法則にしなかった記録 ${r} は records/ にありません`);
const skillLines = read(path.join(root, "SKILL.md")).split("\n").length;
if (skillLines > SKILL_LIMIT) problems.push(`SKILL.md: ${skillLines} 行（上限 ${SKILL_LIMIT}）`);
const multi = [...used].filter(([, v]) => v.length > 1).length;
const neither = [...records.keys()].filter((r) => !used.has(r) && !excluded.has(r)).length;

console.table(rows);
const lawBytes = rows.reduce((n, r) => n + r.バイト, 0);
console.log(`記録 ${records.size} 件（${Math.round(recBytes / 1024)}KB）→ 法則 ${total} 個（${Math.round(lawBytes / 1024)}KB）`);
console.log(`記録の網羅：法則に入っている ${used.size} 件（${Math.round((used.size / records.size) * 100)}%）、法則にしなかった ${excluded.size} 件、どちらでもない ${neither} 件、複数の法則に入っている ${multi} 件`);
lens.sort((a, b) => a - b);
console.log(`確かめること（本文のある行 ${lens.length} 個）：中央 ${lens[Math.floor(lens.length / 2)]} 字、最長 ${lens[lens.length - 1]} 字（上限 ${MAX_LAW_CHARS}）`);
console.log(`SKILL.md ${skillLines} 行（上限 ${SKILL_LIMIT}）／気づきのメモ ${notes} 件／使用の記録がある法則 ${usage.size} 個`);
if (problems.length) { console.log(`\n問題 ${problems.length} 件`); for (const p of problems) console.log(`  ${p}`); }
process.exit(problems.length ? 1 : 0);
