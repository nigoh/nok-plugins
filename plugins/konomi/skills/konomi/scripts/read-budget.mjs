#!/usr/bin/env node
// konomi read-budget：知識の大きさ（層ごと）と、役割×画面の種類ごとの「作るときに読む量」を測り、KNOWLEDGE.md の上限を超えたら fail にする。圧縮の効き目はこの数字で見る。
// 使い方: node read-budget.mjs [--ratio 0.3] [--json]    終了コード: 0＝第 1 の上限内／1＝超えた物がある／2＝表が読めない
// 上限は KNOWLEDGE.md「圧縮の決まり」の表（物｜第 1｜第 2）。第 1 を超えたら fail、第 2 は目標（超えたら「未」と出すだけ）。1 KB＝1,000 バイト（wc -c）。
// 読み分けは references/README.md「何を読むか」の表（◎＝全部読む／○＝INDEX.md で当てはまる判断の節だけ開く／×＝読まない）。
//   本だけ ＝ ◎の本の全部 ＋ INDEX.md ＋ ○の本の全部 × ratio（既定 0.3〔目安〕＝第3回の設計書が引いた節の割合。土台は ID を列挙してあるので 0.1）。
//   全部込み ＝ 本だけ ＋ SKILL.md ＋ README.md ＋ 画面担当の点検表 5 本（flow・visual・interaction・implementation・test）。
// 層：いつも読む＝SKILL.md／読む本＝references/*.md／法則＝laws/／置き場＝records/／雛形＝templates/／道具＝scripts/（__pycache__ を除く）。
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'
const argv = process.argv.slice(2); const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const ratio = Number(flag('--ratio') ?? 0.3); const asJson = argv.includes('--json')
const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const knowledge = path.resolve(skill, '..', '..', 'KNOWLEDGE.md')
const SCREEN_LAWS = ['flow', 'visual', 'interaction', 'implementation', 'test']; const NOT_THEORY = new Set(['README.md', 'INDEX.md', 'design-doc.md'])
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => /^(__pycache__|node_modules|\.git)$/.test(e.name) ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : []
const size = (f) => fs.existsSync(f) ? fs.statSync(f).size : 0; const sum = (fs_) => fs_.reduce((a, f) => a + size(f), 0)
const md = (d) => fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.md')).map((f) => path.join(d, f)) : []
const kb = (b) => (b / 1000).toFixed(1); const rows = (t, head) => { const l = t.split('\n'); const i = l.findIndex((x) => x.startsWith('## ') && x.includes(head)); if (i < 0) return []
  const out = []; for (let j = i + 1; j < l.length && !l[j].startsWith('## '); j++) if (l[j].startsWith('|') && !/^\|[\s\-|:]+\|?$/.test(l[j])) out.push(l[j].split('|').slice(1, -1).map((c) => c.trim())); return out }
// 上限の表
let limits = {}; try { for (const [k, a, b] of rows(fs.readFileSync(knowledge, 'utf8'), '圧縮の決まり').slice(1)) limits[k] = [Number(a), Number(b)] } catch {}
if (!Object.keys(limits).length) { console.error('read-budget: KNOWLEDGE.md の上限の表（圧縮の決まり）が読めません'); process.exit(2) }
// 読み分けの表
const readme = path.join(skill, 'references', 'README.md'); const tbl = fs.existsSync(readme) ? rows(fs.readFileSync(readme, 'utf8'), '何を読むか') : []
if (tbl.length < 2) { console.error('read-budget: references/README.md「何を読むか」の表が読めません'); process.exit(2) }
const roles = tbl[0].slice(1); const ref = (n) => path.join(skill, 'references', n)
const results = []; const fails = []
const check = (name, v, lim = limits[name]) => { if (!lim) return; const r = { name, kb: +kb(v), first: lim[0], second: lim[1], ok: v / 1000 <= lim[0], goal: v / 1000 <= lim[1] }; results.push(r); if (!r.ok) fails.push(r) }
// 層
const refs = md(path.join(skill, 'references')); const laws = md(path.join(skill, 'laws')); const lawBy = (n) => path.join(skill, 'laws', n + '.md')
const layers = [['いつも読む', [path.join(skill, 'SKILL.md')]], ['読む本', refs], ['法則', laws], ['置き場', walk(path.join(skill, 'records'))], ['雛形', walk(path.join(skill, 'templates'))], ['道具', walk(path.join(skill, 'scripts'))]]
console.log('■ 層ごとの大きさ（KB）'); for (const [n, f] of layers) console.log(`  ${n.padEnd(6, '　')} ${kb(sum(f)).padStart(7)}  （${f.length} ファイル）`)
const lines = fs.readFileSync(path.join(skill, 'SKILL.md'), 'utf8').split('\n').length
check('SKILL.md', size(path.join(skill, 'SKILL.md'))); if (lines > 150) fails.push({ name: 'SKILL.md の行数', kb: lines, first: 150 })
for (const f of refs) { const n = path.basename(f); if (limits[n]) check(n, size(f)); else if (!NOT_THEORY.has(n)) check('理論 1 本 ' + n, size(f), limits['理論 1 本']) }
for (const f of laws) { const n = path.basename(f); if (n === 'other-jobs.md') check(n, size(f)); else check('点検表 1 本 ' + n, size(f), limits['点検表 1 本']) }
check('読む本 計', sum(refs)); check('画面担当の点検表 計', sum(SCREEN_LAWS.map(lawBy))); check('置き場 計', sum(layers[3][1])); check('雛形 計', sum(layers[4][1])); check('道具 計', sum(layers[5][1]))
// 役割別
const idx = size(ref('INDEX.md')); const base = size(path.join(skill, 'SKILL.md')) + size(ref('README.md')) + sum(SCREEN_LAWS.map(lawBy))
const perRole = roles.map((role, c) => { const rt = role.includes('土台') ? Math.min(ratio, 0.1) : ratio; let full = 0, open = 0; for (const r of tbl.slice(1)) { const m = (r[c + 1] || '')[0]; const s = size(ref(r[0])); if (m === '◎') full += s; else if (m === '○') open += s }
  const only = full + idx + open * rt; const all = only + base; return { role, only: +kb(only), all: +kb(all), full: +kb(full), open: +kb(open) } })
console.log(`\n■ 役割別の「作るときに読む量」（KB。○の本は ratio ${ratio} だけ開くとして計算。INDEX.md ${kb(idx)}${idx ? '' : '（まだ無い）'}）`)
console.log('  役割'.padEnd(16, '　') + '本だけ   全部込み   （◎全部  ○の本の合計）')
for (const p of perRole) { console.log(`  ${p.role.padEnd(12, '　')} ${String(p.only).padStart(6)} ${String(p.all).padStart(9)}     （${p.full}  ${p.open}）`)
  const sfx = p.role.includes('土台') ? '（土台）' : '（役割別）'; const lo = limits['本だけ' + sfx], la = limits['全部込み' + sfx]; if (lo) check(`本だけ ${p.role}`, p.only * 1000, lo); if (la) check(`全部込み ${p.role}`, p.all * 1000, la) }
console.log('\n■ 上限（第 1＝落とさない線／第 2＝目標）'); for (const r of results) console.log(`  ${r.ok ? '通' : '超'} ${r.goal ? '済' : '未'}  ${r.name.padEnd(28)} ${String(r.kb).padStart(7)}  第1 ${r.first}  第2 ${r.second}`)
if (asJson) console.log(JSON.stringify({ perRole, results }, null, 2))
console.log(fails.length ? `\nFAIL：第 1 の上限を超えた物 ${fails.length} 件` + fails.map((f) => `\n  ${f.name} ${f.kb}（第 1：${f.first}）`).join('') : '\nPASS：第 1 の上限内')
process.exit(fails.length ? 1 : 0)
