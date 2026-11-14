#!/usr/bin/env node
// konomi trace-check：要件→画面→部品→テストのつながりを .konomi/screens.yaml と実際のファイルで照合し、切れ目を evidence/trace-report.json に書く（人やエージェントは書かない）。
// 使い方: node trace-check.mjs [ルート] [--out <フォルダ>]   終了コード: 0＝切れ目なし／1＝切れ目あり／2＝設定の誤り
// 設計書の検査（docs/screens/<slug>.md か SCR-nnn-<slug>.md。sources.design_docs でフォルダを変えられる）：
//   DOC-SIZE 本体 MAX_BODY_BYTES 以内（「## 付録」以降は数えない）fail／DOC-ARROW 判断の行の「→」を含む割合 MIN_ARROW_RATIO 以上 fail／DOC-EMPTY 「対象外」「のとおり」「無い」だけの行 0 fail
//   DOC-TRIED 変更シナリオ表の「試した」が「済」の行 MIN_TRIED 件以上 fail／DOC-MISSING 画面のコードがあるのに設計書が無い warn
// 部品：CMP-nnn は画面に出る部品（data-cmp を持つ）、MOD-nnn は画面に出ない共有の物（screens.yaml の modules:）。画面の中だけの小部品には付けない。
// MOD の検査：MOD-NO-FILE・NO-EXPORT・NO-TEST・SHADOWED は fail、MOD-SINGLE-USE（2 画面以上から取り込まれない）は warn。
// kind: sample の見本ページ（SCR-000 など）は要件・状態・出入口の照合から外す。検査の一覧と MOD の書き方は records/checks.md 末尾「道具の冒頭の注釈」。
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import YAML from "yaml";

const argv = process.argv.slice(2);
const outFlag = argv.indexOf("--out") >= 0 ? argv[argv.indexOf("--out") + 1] : null;
const root = path.resolve(argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--out") ?? ".");
// ---- 設計書の検査の合否の線（ここだけ直せばよい） ----
const MAX_BODY_BYTES = 20 * 1000;            // ① 本体の大きさ（バイト。日本語は 1 字 3 バイト前後）
const APPENDIX_HEADING = /^#{1,3}\s*(付録|別紙)/m; // ① ここから後ろは「本体」に数えない
const MIN_ARROW_RATIO = 0.8;                 // ② 判断の行のうち「事実 → 選んだ物」の形（→ を含む）の割合
const DECISION_LINE = /^- ?[A-Z]{1,2}-\d+[：:]/;
const EMPTY_WORDS = ["対象外", "のとおり", "無い"]; // ③ これだけで済ませた判断の行
const TRIED_COLUMN = "試した";               // ④ 変更シナリオの表の列の名前
const TRIED_DONE = "済";                     // ④ その列で「実際に変えて数えた」を表す値
const MIN_TRIED = 2;                         // ④ 実際に変えて数えた件数の下限
const DOC_MISSING_IS_FAIL = false;           // ⑤ 設計書が無いことを fail にするか（false なら warn）
const STATES = ["default", "empty", "loading", "error", "forbidden", "many", "partial", "offline", "not_found", "locked", "confirming",
  "filtered_empty", "invalid", "saving", "done", "resumed", "conflict", "session_expired", "save_failed", "refreshing", "stale"]; // 後ろの 10 語は states.md E-02
const REQUIRED_DECISION = ["empty", "loading", "error", "forbidden", "many"]; // 書くか、無い理由を書くか
// ---- 共有の物（MOD）の検査の線 ----
const MIN_MOD_USERS = 2;                     // ③ 取り込む画面（または骨格）の数の下限
const SHELL_FILE = /(^|[\\/])src[\\/]app[\\/]AppShell\.tsx$/; // ③ 骨格。全画面が通るので、ここから取り込まれていれば SHELL_WEIGHT 画面ぶんと数える
const SHELL_WEIGHT = 2;
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage", "evidence"]);
const CODE_EXT = /\.(tsx?|jsx?|vue|svelte|astro|html)$/;
const TEST_FILE = /(\.(test|spec)\.[cm]?[tj]sx?$)|([\\/](tests?|e2e|__tests__)[\\/])/;

function fail(msg) {
  console.error(`trace-check: ${msg}`);
  process.exit(2);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  if (fs.statSync(dir).isFile()) { out.push(dir); return out; } // ファイルを直接指定してもよい
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

function collect(dirs, fileFilter, regex) {
  const found = new Map(); // id -> [relative file]
  for (const d of dirs ?? []) {
    for (const f of walk(path.join(root, d))) {
      if (!fileFilter(f)) continue;
      let text = fs.readFileSync(f, "utf8");
      if (CODE_EXT.test(f) && !isTest(f)) text = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:'"`\\])\/\/.*$/gm, "$1"); // コメントの中は除く
      for (const m of text.matchAll(regex)) {
        const id = m[1];
        if (!found.has(id)) found.set(id, []);
        const rel = path.relative(root, f);
        if (!found.get(id).includes(rel)) found.get(id).push(rel);
      }
    }
  }
  return found;
}

// ---- 読み込み ----
const yamlPath = path.join(root, ".konomi", "screens.yaml");
if (!fs.existsSync(yamlPath)) fail(`${path.relative(root, yamlPath)} がありません`);
let doc;
try {
  doc = YAML.parse(fs.readFileSync(yamlPath, "utf8"));
} catch (e) {
  fail(`screens.yaml を読めません: ${e.message}`);
}
const screens = doc?.screens ?? {};
const components = doc?.components ?? {};
const modules = doc?.modules ?? {};
const src = doc?.sources ?? {};
const knownStates = new Set([...STATES, ...(doc?.extra_states ?? [])]);
if (Object.keys(screens).length === 0) fail("screens が空です");

const isTest = (f) => TEST_FILE.test(f);
const reqDefined = collect(src.requirements, () => true, /\b(REQ-\d+)\b/g);
const scrInCode = collect(src.code, (f) => CODE_EXT.test(f) && !isTest(f), /(?:data-scr=["'{`]+|\bid:\s*["'`])(SCR-\d+)/g);
const cmpInCode = collect(src.code, (f) => CODE_EXT.test(f) && !isTest(f), /data-cmp=["'{`]+(CMP-\d+)/g);
const reqInTests = collect(src.tests, isTest, /\[(REQ-\d+)\]/g);
const modInTests = collect(src.tests, isTest, /\[(MOD-\d+)\]/g);
const scrStateInTests = collect(src.tests, isTest, /\[(SCR-\d+:[a-z0-9_]+)\]/g);

// ---- 照合 ----
const problems = [];
const add = (rule, id, message) => problems.push({ rule, id, message });

if (reqDefined.size === 0) {
  add("REQ-SOURCE", "-", `要件の ID が 1 つも見つかりません（sources.requirements: ${JSON.stringify(src.requirements ?? [])}）`);
}

const covered = new Set();
const inbound = new Set();
for (const [sid, s] of Object.entries(screens)) {
  if (!/^SCR-\d+$/.test(sid)) add("ID-FORMAT", sid, "画面 ID は SCR-nnn の形にしてください");
  if (s?.kind === "sample") { // 見本ページ：製品の画面ではない。コードにあることだけ確かめる
    if (!scrInCode.has(sid)) add("SCR-NOT-IMPLEMENTED", sid, `data-scr="${sid}" がコードに見つかりません`);
    continue;
  }
  for (const r of s.covers ?? []) {
    covered.add(r);
    if (reqDefined.size > 0 && !reqDefined.has(r)) add("REQ-UNKNOWN", sid, `${r} は要件の文書に見つかりません`);
  }
  if ((s.covers ?? []).length === 0) add("SCR-NO-REQ", sid, "どの要件も満たしていない画面です（covers が空）");

  // 状態：書くか、無い理由を書くか
  const states = s.states ?? [];
  const none = s.none ?? {};
  const knownState = (st) => knownStates.has(st) || /^(step_\d+|mode_.+|status_.+)$/.test(st) || (st.includes("_") && knownStates.has(st.slice(st.lastIndexOf("_") + 1))); // 部位_共通語・step_n・mode_*・status_*（E-02）
  for (const st of states) if (!knownState(st)) add("STATE-UNKNOWN", sid, `状態 ${st} は語彙にありません（extra_states に足してください）`);
  if (!states.includes("default")) add("STATE-MISSING", sid, "default の状態がありません");
  for (const st of REQUIRED_DECISION) {
    if (!states.includes(st) && !none[st]) add("STATE-UNDECIDED", sid, `状態 ${st} を扱うか、none に無い理由を書いてください`);
    if (states.includes(st) && none[st]) add("STATE-CONFLICT", sid, `状態 ${st} が states と none の両方にあります`);
  }
  // 状態ごとのテスト
  for (const st of states) {
    if (!scrStateInTests.has(`${sid}:${st}`)) add("STATE-NO-TEST", sid, `[${sid}:${st}] を名前に含むテストがありません`);
  }
  // 実装
  if (!scrInCode.has(sid)) add("SCR-NOT-IMPLEMENTED", sid, `data-scr="${sid}" がコードに見つかりません`);
  // 部品
  for (const c of s.components ?? []) {
    if (!components[c]) add("CMP-UNDEFINED", sid, `${c} が components に定義されていません`);
  }
  // 遷移
  for (const t of s.to ?? []) {
    if (!screens[t]) add("TO-UNKNOWN", sid, `行き先 ${t} が screens にありません`);
    inbound.add(t);
  }
  if ((s.to ?? []).length === 0 && !s.terminal) add("SCR-NO-EXIT", sid, "出口がありません（to を書くか、意図した終点なら terminal: true）");
}
for (const sid of Object.keys(screens)) {
  if (screens[sid]?.kind === "sample") continue;
  if (!inbound.has(sid) && !screens[sid].entry) add("SCR-NO-ENTRY", sid, "入口がありません（どの画面の to にも無く、entry: true でもない）");
}

for (const r of reqDefined.keys()) {
  if (!covered.has(r)) add("REQ-NO-SCREEN", r, "どの画面にも割り当てられていません");
  if (!reqInTests.has(r)) add("REQ-NO-TEST", r, `[${r}] を名前に含むテストがありません`);
}

const usedCmp = new Set(Object.values(screens).flatMap((s) => s.components ?? []));
for (const cid of Object.keys(components)) {
  if (!usedCmp.has(cid)) add("CMP-ORPHAN", cid, "どの画面からも使われていません");
  if (!cmpInCode.has(cid)) add("CMP-NOT-IMPLEMENTED", cid, `data-cmp="${cid}" がコードに見つかりません`);
}
for (const cid of cmpInCode.keys()) {
  if (!components[cid]) add("CMP-UNLISTED", cid, `コードにありますが components に載っていません（${cmpInCode.get(cid)[0]}）`);
}
for (const sid of scrInCode.keys()) {
  if (!screens[sid]) add("SCR-UNLISTED", sid, `コードにありますが screens に載っていません（${scrInCode.get(sid)[0]}）`);
}

// ---- 設計書の検査（docs/screens/<slug>.md） ----
const warnings = [];
const warn = (rule, id, message) => (rule === "DOC-MISSING" && DOC_MISSING_IS_FAIL ? problems : warnings).push({ rule, id, message });

// ---- 共有の物（MOD）----
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:'"`\\])\/\/.*$/gm, "$1");
const codeFiles = new Map(); // 相対パス -> コメントを除いた本文（テスト以外）
for (const d of src.code ?? []) for (const f of walk(path.join(root, d))) if (CODE_EXT.test(f) && !isTest(f)) codeFiles.set(path.relative(root, f), stripComments(fs.readFileSync(f, "utf8")));
const resolveSpec = (from, spec) => {
  if (!spec.startsWith(".")) return null;
  const base = path.relative(root, path.resolve(root, path.dirname(from), spec));
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) if (codeFiles.has(c)) return c;
  return null;
};
const bare = (n) => n.trim().replace(/^type\s+/, "");
const namesOf = (block) => block.split(",").map(bare).filter(Boolean).map((n) => ({ from: n.split(/\s+as\s+/)[0].trim(), as: n.split(/\s+as\s+/).pop().trim() }));
function exportsOf(text) { // 宣言で出す名前と { } で出す名前（再出力の { a as b } は b）。export * from は reexports で見る
  const out = new Set();
  for (const m of text.matchAll(/export\s+(?:default\s+)?(?:declare\s+)?(?:async\s+)?(?:function\s*\*?|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)) out.add(m[1]);
  for (const m of text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) for (const n of namesOf(m[1])) out.add(n.as);
  return out;
}
const importsOf = (file) => { // [{ target, names: Set<元の名前> | "*" }]
  const text = codeFiles.get(file); const out = [];
  for (const m of text.matchAll(/import\s+(?:type\s+)?([\w$]+\s*,?\s*)?(?:\{([^}]*)\}|\*\s+as\s+[\w$]+)?\s*from\s*['"]([^'"]+)['"]/g)) {
    const target = resolveSpec(file, m[3]); if (!target) continue;
    out.push({ target, names: m[2] !== undefined ? new Set(namesOf(m[2]).map((n) => n.from)) : "*" });
  }
  return out;
};
const reexportsOf = (file) => { // [{ target, names: Map<出す名前, 元の名前> | "*" }]
  const text = codeFiles.get(file); const out = [];
  for (const m of text.matchAll(/export\s+(?:type\s+)?(\*|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/g)) {
    const target = resolveSpec(file, m[2]); if (!target) continue;
    out.push({ target, names: m[1] === "*" ? "*" : new Map(namesOf(m[1].slice(1, -1)).map((n) => [n.as, n.from])) });
  }
  return out;
};
const reexportCache = new Map();
const reexports = (f) => reexportCache.get(f) ?? (reexportCache.set(f, reexportsOf(f)), reexportCache.get(f));
// file が name を（自分の宣言か、再出力の先から）出しているか。target は探している本体
function provides(file, name, target, seen = new Set()) {
  if (seen.has(file)) return false; seen.add(file);
  if (file === target) return exportsOf(codeFiles.get(file)).has(name);
  for (const r of reexports(file)) {
    if (r.names === "*") { if (provides(r.target, name, target, seen)) return true; }
    else if (r.names.has(name) && provides(r.target, r.names.get(name), target, seen)) return true;
  }
  return false;
}
// file が name を出しているか（本体を指定せず、宣言か再出力のどちらでも）
function exportsName(file, name, seen = new Set()) {
  if (seen.has(file)) return false; seen.add(file);
  if (exportsOf(codeFiles.get(file)).has(name)) return true;
  for (const r of reexports(file)) {
    if (r.names === "*") { if (exportsName(r.target, name, seen)) return true; }
    else if (r.names.has(name) && exportsName(r.target, r.names.get(name), seen)) return true;
  }
  return false;
}
const FN_DEF = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=>/gm;
const screenSlugOf = (rel) => { const p = rel.split(path.sep); const i = p.indexOf("screens"); return i >= 0 ? p[i + 1] : null; };
const modUsers = {};
for (const [mid, m] of Object.entries(modules)) {
  if (!/^MOD-\d+$/.test(mid)) add("ID-FORMAT", mid, "共有の物の ID は MOD-nnn の形にしてください");
  for (const r of m?.covers ?? []) if (reqDefined.size > 0 && !reqDefined.has(r)) add("REQ-UNKNOWN", mid, `${r} は要件の文書に見つかりません`);
  const file = m?.file ? path.normalize(m.file) : null;
  const names = m?.exports ?? [];
  if (!file || !codeFiles.has(file)) { add("MOD-NO-FILE", mid, `file ${m?.file ?? "(未記入)"} が見つかりません`); continue; }
  if (names.length === 0) add("MOD-NO-EXPORT", mid, "exports が空です（出す名前を書く）");
  for (const n of names) if (!exportsName(file, n)) add("MOD-NO-EXPORT", mid, `${m.file} から ${n} が出ていません`);
  // ③ 取り込む画面（または骨格）。名前のどれかを、直接か土台の入口（index）経由で取り込んでいる物を数える
  const units = new Map(); // 画面の slug か相手のファイル -> 数え方の重み
  for (const g of codeFiles.keys()) {
    if (g === file) continue;
    const uses = importsOf(g).some((i) => (i.names === "*" ? names.some((n) => provides(i.target, n, file)) : [...i.names].some((n) => names.includes(n) && provides(i.target, n, file))));
    if (!uses) continue;
    const slug = screenSlugOf(g);
    units.set(slug ?? g, SHELL_FILE.test(g) ? SHELL_WEIGHT : 1);
  }
  const users = [...units.values()].reduce((a, b) => a + b, 0);
  modUsers[mid] = users;
  if (users < MIN_MOD_USERS) warn("MOD-SINGLE-USE", mid, `${[...units.keys()].join(", ") || "どこからも"}だけが取り込んでいます（${users}）。共有の物にする理由が無い。画面の中に置く`);
  // ④ テスト
  if (!modInTests.has(mid)) add("MOD-NO-TEST", mid, `[${mid}] を名前に含むテストがありません`);
  // ⑤ 画面の中に同じ名前の関数・フック
  for (const [g, text] of codeFiles) {
    const slug = screenSlugOf(g); if (!slug || g === file) continue;
    for (const dm of text.matchAll(FN_DEF)) { const n = dm[1] || dm[2]; if (names.includes(n)) add("MOD-SHADOWED", mid, `${g} が ${n} を定義しています。土台の物（${m.file}）を使う`); }
  }
}
const docDirs = src.design_docs ?? ["docs/screens"];
const slugOf = (s) => /[?&]screen=([\w-]+)/.exec(s?.path ?? "")?.[1] ?? null;
const findDoc = (slug) => { for (const d of docDirs) { const dir = path.join(root, d); if (!fs.existsSync(dir)) continue; const hit = fs.readdirSync(dir).find((f) => f === `${slug}.md` || new RegExp(`^SCR-\\d+-${slug}\\.md$`).test(f)); if (hit) return path.join(dir, hit) } return null }; // <slug>.md か SCR-nnn-<slug>.md
const codeDirs = (src.code ?? []).map((d) => path.join(root, d, "screens"));
const docStats = [];
for (const [sid, s] of Object.entries(screens)) {
  if (s?.kind === "sample") continue;
  const slug = slugOf(s); if (!slug) continue;
  const hasCode = codeDirs.some((d) => fs.existsSync(path.join(d, slug))) || scrInCode.has(sid);
  const file = findDoc(slug);
  if (!file) { if (hasCode) warn("DOC-MISSING", sid, `画面のコード（${slug}）があるのに設計書 ${docDirs[0]}/${slug}.md がありません`); continue; }
  const text = fs.readFileSync(file, "utf8"); const rel = path.relative(root, file);
  const cut = text.search(APPENDIX_HEADING); const body = cut >= 0 ? text.slice(0, cut) : text;
  const bytes = Buffer.byteLength(body, "utf8");
  if (bytes > MAX_BODY_BYTES) add("DOC-SIZE", sid, `${rel} の本体が ${(bytes / 1000).toFixed(1)}KB（上限 ${MAX_BODY_BYTES / 1000}KB）。当てはまらない判断を書かず、事実→選んだ物の 1 行にする`);
  const dec = text.split("\n").filter((l) => DECISION_LINE.test(l));
  const arrow = dec.filter((l) => l.includes("→")).length;
  const ratio = dec.length ? arrow / dec.length : 0;
  if (dec.length === 0) add("DOC-ARROW", sid, `${rel} に判断の行が 1 つもありません（行頭を「- D-01：」の形にする。箇条書きの「- 」が無いと数えない）`);
  else if (ratio < MIN_ARROW_RATIO) add("DOC-ARROW", sid, `${rel} の判断の行 ${dec.length} 行のうち「→」を含むのは ${arrow} 行（${(ratio * 100).toFixed(0)}%、下限 ${MIN_ARROW_RATIO * 100}%）。判断は「事実（数字・条件）→ 選んだ物」の形`);
  const strip = (l) => { let t = l.replace(DECISION_LINE, "").replace(/[`*_]/g, ""); for (const w of [...EMPTY_WORDS, "ない"]) t = t.split(w).join(""); return t.replace(/[\s。、．.，,：:／/（）()「」は が も です この 画面 該当 全体 土台 同じ 前に 上と 上の]+/g, "").replace(/\b[A-Z]{1,2}-\d+\b/g, "").replace(/[A-Za-z0-9._-]+\.(md|ts|tsx|yaml)/g, "") };
  const empty = dec.filter((l) => EMPTY_WORDS.some((w) => l.includes(w)) && !l.includes("→") && strip(l).length <= 4);
  if (empty.length) add("DOC-EMPTY", sid, `${rel} に「${EMPTY_WORDS.join("」「")}」だけの判断の行が ${empty.length} 行: ${empty.slice(0, 3).map((l) => l.slice(0, 24).replace(/。+$/, "")).join(" / ")}。当てはまらない判断は書かない`);
  // ④ 変更シナリオの表
  const hd = text.search(/^#{2,4}\s.*変更シナリオ/m); let tried = 0, hasCol = false;
  if (hd >= 0) {
    const rows = text.slice(hd).split("\n").slice(1); let cols = null;
    for (const l of rows) {
      if (/^#{1,4}\s/.test(l) && cols) break;
      if (!l.trim().startsWith("|")) { if (cols && l.trim() === "") break; continue; }
      const cells = l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      if (!cols) { cols = cells; hasCol = cols.some((c) => c.includes(TRIED_COLUMN)); continue; }
      if (/^[-: ]+$/.test(cells.join(""))) continue;
      const i = cols.findIndex((c) => c.includes(TRIED_COLUMN)); if (i >= 0 && cells[i] === TRIED_DONE) tried++;
    }
  }
  if (hd < 0) add("DOC-TRIED", sid, `${rel} に変更シナリオの表が見つかりません`);
  else if (tried < MIN_TRIED) add("DOC-TRIED", sid, `${rel} の変更シナリオの表で、列「${TRIED_COLUMN}」が「${TRIED_DONE}」の行が ${tried} 件（下限 ${MIN_TRIED}）${hasCol ? "" : "。列「" + TRIED_COLUMN + "」がありません"}。実際に変えて触ったファイルを数える`);
  docStats.push({ screen: sid, file: rel, bytes, decisions: dec.length, arrow, tried });
}

// ---- 出力 ----
let commit = null;
try {
  commit = execSync("git rev-parse HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {}
const report = {
  tool: "konomi trace-check",
  generatedAt: new Date().toISOString(),
  commit,
  status: problems.length === 0 ? "pass" : "fail",
  warnings,
  docs: docStats,
  counts: {
    requirements: reqDefined.size,
    screens: Object.values(screens).filter((x) => x?.kind !== "sample").length,
    components: Object.keys(components).length,
    modules: Object.keys(modules).length,
    states: Object.values(screens).reduce((n, s) => n + (s.states ?? []).length, 0),
    problems: problems.length,
    warnings: warnings.length,
  },
  problems,
};
const outDir = path.resolve(outFlag ?? path.join(root, "evidence"));
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "trace-report.json"), JSON.stringify(report, null, 2) + "\n");

const c = report.counts;
console.log(`要件 ${c.requirements} / 画面 ${c.screens} / 部品 ${c.components} / 共有の物 ${c.modules} / 状態 ${c.states} → 切れ目 ${c.problems} 件`);
const byRule = {};
for (const p of problems) (byRule[p.rule] ??= []).push(p);
for (const [rule, list] of Object.entries(byRule)) {
  console.log(`\n${rule}（${list.length}）`);
  for (const p of list) console.log(`  ${p.id}  ${p.message}`);
}
if (warnings.length) {
  console.log(`\n警告（合否に入れない）${warnings.length} 件`);
  for (const w of warnings) console.log(`  ${w.rule}  ${w.id}  ${w.message}`);
}
console.log(`\n${path.join(outDir, "trace-report.json")} に書きました（${report.status}）`);
process.exit(problems.length === 0 ? 0 : 1);
