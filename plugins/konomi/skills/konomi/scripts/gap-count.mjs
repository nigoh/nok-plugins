#!/usr/bin/env node
// konomi gap-count：作業中の気づき（--note）を数え、「土台に足りない」物を何画面から出たかで表にする。teamwork.md B-07 ①。合流の前に走らせ、3 画面以上（★）を先に土台へ上げる。
// 使い方: node gap-count.mjs [--file <usage.jsonl>] [--min 2] [--repo <名前>] [--since <ISO 日時>] [--json]
//   既定は $KONOMI_HOME/usage.jsonl（無ければ ~/.claude/konomi/usage.jsonl）。--min 画面数の下限（既定 2、1 で全部）。
// 記録のしかた: node law-used.mjs --note "<画面の slug>：土台に足りない：<物の名前>が無い。…"（行頭の「<slug>：」が画面名。無ければ「画面不明」）
// 数え方: note だけを読み、「土台に足りない」「矛盾」「誤検出」「仮置き・自作」「無い・不足」の語を含む物だけを対象に、名前（ID・部品名・ファイル名・道具名・状態名・`…` の語）を拾い、出た画面の数で束ねる。
// 終了コード: 0（報告の道具で合否は出さない）。usage.jsonl が無いときだけ 2。
// 数え方の全文は records/checks.md 末尾「道具の冒頭の注釈」。
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'

const argv = process.argv.slice(2)
const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const dir = process.env.KONOMI_HOME || path.join(os.homedir(), '.claude', 'konomi')
const file = path.resolve(flag('--file') || path.join(dir, 'usage.jsonl'))
const minScreens = Number(flag('--min') ?? 2); const repoOnly = flag('--repo'); const since = flag('--since'); const asJson = argv.includes('--json')
if (!fs.existsSync(file)) { console.error(`gap-count: ${file} がありません（law-used.mjs --note で記録した行が要ります）`); process.exit(2) }

// 気づきの種類（先に当たった物がその note の種類）
const KINDS = [
  ['土台に足りない', /土台に足りない|土台に(?:無い|ない)|土台へ上げ/],
  ['矛盾・食い違い', /矛盾|食い違|衝突|三つ巴|緊張する|揺れる/],
  ['誤検出', /誤検出|巻き込|落とす/],
  ['仮置き・自作', /仮置き|仮に|画面内で作|画面で作|画面の中で作|自作|同じ物を持って|直書き/],
  ['無い・不足', /足りな|不足|未定義|無い|無く|がない|が ない|ありません|決まって(?:いない|ない)|書いて(?:いない|ない)|欠け|置き場所が決まっていない|出どころが/],
]
const kindOf = (t) => { for (const [k, re] of KINDS) if (re.test(t)) return k; return null }

const SKIP = new Set(['TypeScript', 'JavaScript', 'React', 'Tailwind', 'HTML', 'CSS', 'API', 'URL', 'DOM', 'JSON', 'Python', 'Node', 'Chrome', 'Safari', 'iOS', 'Android', 'OK', 'NG', 'PC', 'REQ', 'CMP', 'SCR'])
// 名前を拾う
function namesOf(text) {
  const out = new Set(); const add = (n) => { n = n.replace(/[.,:;）)」]+$/, ''); if (n.length >= 3 && !SKIP.has(n)) out.add(n) }
  for (const m of text.matchAll(/`([^`]{2,40})`/g)) add(m[1].trim())
  for (const m of text.matchAll(/\b(?:REQ|CMP|SCR|WORDS|BT|DAT|[A-Z]{1,2})-\d+(?:-\d+)?\b/g)) add(m[0])
  for (const m of text.matchAll(/(?<![\w-])[A-Za-z_][\w-]*(?:\.[A-Za-z]{1,5})?(?![\w-])/g)) {
    const w = m[0]; if (w.length < 3) continue
    const isFile = /\.(?:tsx?|mjs|jsx?|py|md|ya?ml|json|css|html)$/.test(w)
    const camel = /^[a-z][a-z0-9]*[A-Z]/.test(w)                    // useFake・formatDate
    const pascal = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)+$/.test(w)    // AppShell・DataTable
    const word = /^[A-Z][a-z]{3,}$/.test(w)                         // Dialog・Radio・Stepper
    const kebab = /^[a-z]+(?:-[a-z]+)+$/.test(w)                    // ui-audit・aria-sort
    const snake = /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(w)              // save_failed・filtered_empty
    if (isFile || camel || pascal || word || kebab || snake) add(w)
  }
  return [...out]
}

// 読む
const rows = []; let bad = 0
for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
  if (!l.trim()) continue
  let d; try { d = JSON.parse(l) } catch { bad++; continue }
  if (!d.note) continue
  if (repoOnly && d.repo !== repoOnly) continue
  if (since && d.at < since) continue
  for (const part of String(d.note).split(/\s+--note\s+/)) {
    const t = part.trim(); if (!t) continue
    const m = /^([a-z][a-z0-9-]*)\s*[：:]\s*/.exec(t)
    rows.push({ at: d.at, repo: d.repo, screen: m ? m[1] : null, text: m ? t.slice(m[0].length) : t })
  }
}
const target = rows.filter((r) => kindOf(r.text))

// 束ねる
const byName = new Map()
for (const r of target) {
  const kind = kindOf(r.text)
  for (const n of namesOf(r.text)) {
    const key = n.toLowerCase(); const g = byName.get(key) ?? { name: n, forms: new Map(), screens: new Set(), unknown: 0, notes: 0, kinds: new Map(), example: r.text }
    g.forms.set(n, (g.forms.get(n) ?? 0) + 1); g.notes++; g.kinds.set(kind, (g.kinds.get(kind) ?? 0) + 1)
    if (r.screen) g.screens.add(r.screen); else g.unknown++
    byName.set(key, g)
  }
}
const list = [...byName.values()].map((g) => ({ name: [...g.forms.entries()].sort((a, b) => b[1] - a[1])[0][0], screens: [...g.screens].sort(), screenCount: g.screens.size, unknown: g.unknown, notes: g.notes, kind: [...g.kinds.entries()].sort((a, b) => b[1] - a[1])[0][0], example: g.example.replace(/\s+/g, ' ').slice(0, 44) }))
  .filter((g) => g.screenCount >= minScreens || (minScreens <= 1))
  .sort((a, b) => b.screenCount - a.screenCount || b.notes - a.notes || a.name.localeCompare(b.name))

if (asJson) { console.log(JSON.stringify({ file, notes: rows.length, counted: target.length, unknownScreen: target.filter((r) => !r.screen).length, names: list }, null, 2)); process.exit(0) }

const screensTotal = new Set(target.map((r) => r.screen).filter(Boolean)).size
console.log(`gap-count: ${path.basename(path.dirname(file))}/${path.basename(file)} の note ${rows.length} 件のうち、足りない・矛盾・無い、の報告 ${target.length} 件（${screensTotal} 画面、画面不明 ${target.filter((r) => !r.screen).length} 件）${bad ? `。読めない行 ${bad}` : ''}`)
if (!list.length) { console.log(`画面数 ${minScreens} 以上の名前はありません（--min 1 で全部）`); process.exit(0) }
const pad = (s, n) => { let w = 0, o = ''; for (const ch of s) { const c = ch.codePointAt(0) > 0x2e80 ? 2 : 1; if (w + c > n) break; o += ch; w += c } return o + ' '.repeat(Math.max(0, n - w)) }
console.log('\n' + ['', pad('名前', 22), pad('画面数', 6), pad('件数', 4), pad('種類', 14), '画面'].join(' '))
console.log('-'.repeat(100))
for (const g of list) console.log([g.screenCount >= 3 ? '★' : ' ', pad(g.name, 22), pad(String(g.screenCount), 6), pad(String(g.notes), 4), pad(g.kind, 14), g.screens.join('・') + (g.unknown ? `（＋画面不明 ${g.unknown}）` : '')].join(' '))
const top = list.filter((g) => g.screenCount >= 3)
console.log(`\n★ 3 画面以上: ${top.length} 件${top.length ? '（' + top.map((g) => g.name).join('、') + '）→ 土台に上げる候補（B-03）' : ''}`)
