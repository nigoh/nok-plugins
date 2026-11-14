#!/usr/bin/env node
// konomi src-lint：React + Tailwind のソースを読み、構造の理論（S-03・S-04・S-08）と好みの決まりを機械で確かめる。
// 使い方: node src-lint.mjs <ルート> [src のフォルダ=src] [--only <slug>[,..]] [--out <フォルダ>] [--dist <1 枚に固めた html>]
//   --only 指定した画面（src/screens/<slug>）の指摘だけ／--out evidence の出し先／--dist 固めた html の大きさを参考に出す（目標は screens.yaml の targets、既定 300KB。超えたら fail）。
// 層の既定：lib は誰からも取り込める（lib は他を取り込まない）。ui は lib 以外を、data は ui・screens・app を、screens は他の画面を取り込まない。
// S-03：画面をまたぐ重複（同じ定数が 3 ファイル以上／同じ名前の関数が 2 か所以上／画面が history を直接呼ぶ）。warn、3 画面以上で fail。小さな関数は一致度で info にとどめる。
// 終了コード：fail があれば 1。warn だけなら 0。
// 規則の詳細は records/checks.md 末尾「道具の冒頭の注釈」。
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'
const argv = process.argv.slice(2); const flag = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null }
const valueFlags = new Set(['--only', '--out', '--dist']); const pos = argv.filter((a, i) => !a.startsWith('--') && !valueFlags.has(argv[i - 1]))
const root = path.resolve(pos[0] || '.'); const src = path.join(root, pos[1] || 'src')
const only = flag('--only') ? flag('--only').split(/[,\s]+/).filter(Boolean) : null
const outDir = path.resolve(flag('--out') || path.join(root, 'evidence')); const distFile = flag('--dist')
// ---- S-03 の同じ名前の関数の線（ここだけ直せばよい） ----
const DUP_FN_SMALL_LINES = 3   // 本体がこの行数以下の関数は「小さな関数」。名前だけで fail にしない
const DUP_FN_SIMILAR = 0.8     // 小さな関数が fail・warn になるのは、中身（語と記号の並び）の一致度がこれ以上のとき
const FOUNDATION = new Set(['lib', 'ui', 'parts', 'app', 'data'])   // 土台の層（画面の関数が同じ名前で在れば数える）
const SPACE_OK = new Set(['0', 'px', '0.5', '1', '2', '3', '4', '6', '8', '12', '20', 'auto', 'full'])
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])
const files = walk(src).filter((f) => /\.(tsx?|css)$/.test(f))
const rel = (f) => path.relative(root, f)
const layerOf = (f) => { const r = path.relative(src, f).split(path.sep); return ['ui', 'data', 'app', 'screens', 'lib'].includes(r[0]) ? r[0] : 'other' }
const screenOf = (f) => { const r = path.relative(src, f).split(path.sep); return r[0] === 'screens' ? r[1] : null }
const checks = []; const add = (id, file, status, detail = '') => checks.push({ id, file, status, detail })
const classCount = new Map(); const perScreen = {}
const noComment = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
const consts = new Map(); const funcs = new Map(); const hist = new Map()   // S-03 の候補：定数（名前=値 → ファイル）・関数（名前 → ファイル）・history 直呼び（画面 → 箇所）
const SKIP_FN = new Set(['App', 'Screen', 'Page', 'Root', 'main', 'render', 'default', 'Props', 'index'])
// 関数の本体（{ } か、アロー関数の式）。arrow=true なら from は「=>」の直後、false なら関数名の直後
const bodyOf = (c, from, arrow) => {
  let i = from
  if (arrow) { while (i < c.length && /\s/.test(c[i])) i++ }
  else { let d = 0; for (; i < c.length; i++) { if (c[i] === '(') d++; else if (c[i] === ')' && --d === 0) { i++; break } } while (i < c.length && c[i] !== '{') i++ }
  const start = i; let d = 0
  if (c[i] === '{') { for (; i < c.length; i++) { if (c[i] === '{') d++; else if (c[i] === '}' && --d === 0) { i++; break } } return c.slice(start, Math.min(i, start + 4000)) }
  for (; i < c.length && i < start + 4000; i++) { const ch = c[i]; if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) d--; if (d < 0 || (ch === '\n' && d === 0)) break }
  return c.slice(start, i)
}
const tokenBag = (b) => { const m = new Map(); for (const t of b.match(/[\w$]+|[^\s\w$]/g) || []) m.set(t, (m.get(t) || 0) + 1); return m }
const similarity = (a, b) => { const x = tokenBag(a), y = tokenBag(b); let inter = 0, uni = 0; for (const k of new Set([...x.keys(), ...y.keys()])) { const p = x.get(k) || 0, q = y.get(k) || 0; inter += Math.min(p, q); uni += Math.max(p, q) } return uni === 0 ? 1 : inter / uni }
const placeOf = (f) => { const r = path.relative(src, f).split(path.sep); return r[0] === 'screens' ? { kind: 'screen', name: r[1] } : FOUNDATION.has(r[0]) ? { kind: 'base', name: path.relative(root, f) } : null }
const balanced = (lines, i) => { let d = 0, j = i; for (; j < Math.min(lines.length, i + 30); j++) { for (const ch of lines[j].replace(/(['"`]).*?\1/g, '')) { if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) d-- } if (d <= 0) break } return lines.slice(i, j + 1).join(' ').replace(/\s+/g, ' ').trim() }
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8'); const r = rel(f); const isTest = /\.test\.tsx?$/.test(f); const isTokens = /tokens\.css$|index\.css$/.test(f)
  const lines = t.split('\n').length
  if (!isTokens) {
    const colors = [...t.matchAll(/#[0-9a-fA-F]{3,8}\b(?![\w-])|rgba?\([^)]*\)|hsla?\([^)]*\)/g)].map((m) => m[0]).filter((c) => !/^#\d+$/.test(c) || c.length === 4 || c.length === 7)
    if (colors.length) add('src-hardcoded-color', r, 'fail', [...new Set(colors)].slice(0, 5).join(', '))
    const arb = [...t.matchAll(/(?<![\w/])([a-z-]+(?::[a-z-]+)*)-\[([^\]]+)\]/g)].map((m) => m[0])
    const arbColor = arb.filter((a) => /\[#|\[rgb|\[hsl/.test(a))
    if (arbColor.length) add('src-arbitrary-color', r, 'fail', arbColor.slice(0, 5).join(' '))
    const arbOther = arb.filter((a) => !/\[#|\[rgb|\[hsl/.test(a))
    if (arbOther.length && !isTest) add('src-arbitrary-value', r, 'info', `${arbOther.length} か所: ` + [...new Set(arbOther)].slice(0, 6).join(' '))
    const styles = (t.match(/style=\{\{/g) || []).length
    if (styles && !isTest) add('src-inline-style', r, 'info', `${styles} か所`)
    const off = [...t.matchAll(/(?<![\w-])(?:[a-z]+:)*-?(?:p|m|gap|space)[xytrblse]?-(\d+(?:\.\d+)?)(?![\w.])/g)].filter((m) => !SPACE_OK.has(m[1])).map((m) => m[0])
    if (off.length && !isTest) add('src-spacing-off-scale', r, 'info', `${off.length} か所: ` + [...new Set(off)].slice(0, 8).join(' '))
    const motion = [...t.matchAll(/duration-(\d+)|duration-\[[^\]]+\]/g)].map((m) => m[0])
    if (motion.length && !isTest) add('src-motion-raw-duration', r, 'fail', '時間は動きのトークンで書く: ' + [...new Set(motion)].slice(0, 4).join(' '))
  }
  if (/\.tsx?$/.test(f) && !isTest) {
    const L = layerOf(f); const S = screenOf(f)
    for (const m of t.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      if (!m[1].startsWith('.')) continue
      const target = path.resolve(path.dirname(f), m[1]); const TL = layerOf(target); const TS = screenOf(target)
      if (L === 'lib' && ['ui', 'data', 'app', 'screens'].includes(TL)) add('S-04-layer-import', r, 'fail', `lib が ${TL} を取り込んでいる（lib は他の層を取り込まない）: ${m[1]}`)
      if (L === 'ui' && TL !== 'ui' && TL !== 'other' && TL !== 'lib') add('S-04-layer-import', r, 'fail', `基本の部品が ${TL} を取り込んでいる: ${m[1]}`)
      if (L === 'data' && ['ui', 'screens', 'app'].includes(TL)) add('S-04-layer-import', r, 'fail', `データの層が ${TL} を取り込んでいる: ${m[1]}`)
      if (L === 'screens' && TL === 'screens' && TS !== S) add('S-04-layer-import', r, 'fail', `画面が他の画面を取り込んでいる: ${m[1]}`)
      if (L === 'app' && TL === 'screens' && !/registry/.test(f)) add('S-04-layer-import', r, 'fail', `骨格が画面を取り込んでいる: ${m[1]}`)
    }
    { const c = noComment(t); const L2 = c.split('\n')
      L2.forEach((ln, i) => { const m = /^(?:export\s+)?const\s+([A-Z][A-Z0-9_]{2,})\s*(?::[^=]+)?=\s*(.*)$/.exec(ln); if (!m) return
        const v = balanced(L2, i).replace(/^.*?=\s*/, '').replace(/;$/, ''); const k = m[1] + ' = ' + v.slice(0, 120); if (!consts.has(k)) consts.set(k, new Set()); consts.get(k).add(r) })
      const place = placeOf(f)
      for (const m of c.matchAll(/^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|^(?:export\s+)?const\s+([a-z][\w$]*|[A-Z][a-z][\w$]*)\s*(?::[^=\n]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::[^=\n]+)?=>/gm)) {
        const n = m[1] || m[2]; if (!n || SKIP_FN.has(n) || !place) continue; if (!funcs.has(n)) funcs.set(n, []); const body = bodyOf(c, m.index + m[0].length, !m[1]).trim()
        funcs.get(n).push({ file: r, place, body, lines: body.split('\n').length }) }
      if (S) for (const m of c.matchAll(/\b(?:window\.)?history\.(replaceState|pushState)\b/g)) { if (!hist.has(S)) hist.set(S, []); hist.get(S).push(`${r}#${c.slice(0, m.index).split('\n').length} ${m[1]}`) } }
    if (lines > 250) add('S-02-file-size', r, 'info', `${lines} 行（1 ファイル 1 部品か、分けるかを見直す目安）`)
    const comps = (t.match(/^(?:export\s+)?function\s+[A-Z]\w*\s*\(/gm) || []).length
    if (comps > 3) add('S-02-components-per-file', r, 'info', `部品 ${comps} 個が 1 ファイルにある`)
    for (const m of t.matchAll(/className=(?:"([^"]{50,})"|\{`([^`$]{50,})`\})/g)) { const k = (m[1] || m[2]).trim().split(/\s+/).sort().join(' '); if (!classCount.has(k)) classCount.set(k, new Set()); classCount.get(k).add(r + '#' + t.slice(0, m.index).split('\n').length) }
    if (S) { const p = (perScreen[S] ||= { files: 0, lines: 0, tests: 0, uiImports: new Set(), rawTags: 0 }); p.files++; p.lines += lines
      for (const m of t.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]*\/ui(?:\/index)?['"]/g)) m[1].split(',').map((x) => x.trim().split(' ')[0]).filter(Boolean).forEach((x) => p.uiImports.add(x))
      p.rawTags += (t.match(/<(button|input|select|textarea)[\s>]/g) || []).length }
  }
  if (isTest) { const S = screenOf(f); if (S) (perScreen[S] ||= { files: 0, lines: 0, tests: 0, uiImports: new Set(), rawTags: 0 }).tests += (t.match(/\b(?:it|test)\(/g) || []).length }
}
const dups = [...classCount.entries()].filter(([, s]) => s.size >= 3).sort((a, b) => b[1].size - a[1].size)
for (const [k, s] of dups.slice(0, 15)) add('S-03-repeated-classes', '*', 'info', `${s.size} か所で同じ並び: "${k.slice(0, 70)}…" 例 ${[...s].slice(0, 3).join(', ')}`)
for (const [s, p] of Object.entries(perScreen)) add('screen-summary', `screens/${s}`, 'info', `ファイル ${p.files}、${p.lines} 行、テスト ${p.tests} 件、基本の部品 ${p.uiImports.size} 種、素の button/input など ${p.rawTags} 個`)
// ---- S-03 の候補：warn。3 画面以上に出たら fail ----
const scr = (files) => [...new Set([...files].map((f) => { const r = path.relative(src, path.resolve(root, f)).split(path.sep); return r[0] === 'screens' ? r[1] : null }).filter(Boolean))]
const keep = (screensHit) => !only || screensHit.some((x) => only.includes(x))
for (const [k, fs_] of consts) { if (fs_.size < 3) continue; const ss = scr(fs_); if (!keep(ss)) continue
  add('S-03-dup-const', '*', ss.length >= 3 ? 'fail' : 'warn', `${fs_.size} ファイル（${ss.length} 画面）に同じ定数: ${k.slice(0, 60)} 例 ${[...fs_].slice(0, 4).join(', ')}。土台（lib か data）へ上げる候補`) }
for (const [n, defs] of funcs) {
  const places = new Map(); for (const d of defs) { const k = d.place.kind + ':' + d.place.name; if (!places.has(k)) places.set(k, d) }   // 場所ごとに最初の 1 つ
  if (places.size < 2) continue
  const reps = [...places.values()]; const ss = reps.filter((d) => d.place.kind === 'screen').map((d) => d.place.name)
  if (!keep(ss) && (only || ss.length === 0)) continue
  let sum = 0, pairs = 0; for (let i = 0; i < reps.length; i++) for (let j = i + 1; j < reps.length; j++) { sum += similarity(reps[i].body, reps[j].body); pairs++ }
  const sim = sum / pairs; const small = reps.every((d) => d.lines <= DUP_FN_SMALL_LINES)
  const status = small && sim < DUP_FN_SIMILAR ? 'info' : places.size >= 3 ? 'fail' : 'warn'
  const where = [ss.length ? `画面 ${ss.join(', ')}` : '', ...[...new Set(reps.filter((d) => d.place.kind === 'base').map((d) => d.file))].map((f) => `土台 ${f}`)].filter(Boolean).join('／')
  add('S-03-dup-function', '*', status, `同じ名前の関数・フック ${n} が ${places.size} か所（${where}）にある。中身の一致度 ${(sim * 100).toFixed(0)}%${small ? `・本体 ${DUP_FN_SMALL_LINES} 行以下` : ''}。${status === 'info' ? '小さく中身が別なので名前だけでは数えない' : '土台へ上げる（同じ決めごと）か、画面の意味が分かる名前に変える（別の決めごと）'}`)
}
{ const ss = [...hist.keys()].filter((x) => keep([x])); if (ss.length) add('S-03-history-direct', '*', hist.size >= 3 ? 'fail' : 'warn', `画面が history.replaceState／pushState を直接呼んでいる（全体で ${hist.size} 画面）: ${ss.map((x) => hist.get(x)[0]).slice(0, 4).join(', ')}。URL の読み書きは土台の 1 つに（useUrlParam など）`) }
// ---- ビルドの大きさ（--dist） ----
if (distFile) {
  let kb = null, gz = null
  try { const y = fs.readFileSync(path.join(root, '.konomi', 'screens.yaml'), 'utf8'); const t = y.match(/^targets:\n((?:[ \t]+.*\n?|\n)*)/m)?.[1] || ''
    const n = t.match(/bundle_kb:\s*(\d+(?:\.\d+)?)/); const perf = t.match(/performance:\s*(.*)/)?.[1] || ''
    if (n) kb = +n[1]; else { const a = perf.match(/(\d+(?:\.\d+)?)\s*KB\s*以内/); if (a) kb = +a[1] }
    const g = t.match(/gzip_kb:\s*(\d+(?:\.\d+)?)/) || perf.match(/gzip\s*(\d+(?:\.\d+)?)\s*KB/i); if (g) gz = +g[1] } catch {}
  const buf = fs.readFileSync(path.resolve(distFile)); const size = buf.length / 1000, gzs = zlib.gzipSync(buf).length / 1000; const limit = kb ?? 300
  add('bundle-size', path.basename(distFile), 'info', `${size.toFixed(0)}KB（目標 ${limit}KB${kb === null ? '：既定' : '：screens.yaml'}）`)
  if (gz !== null) add('bundle-size-gzip', path.basename(distFile), 'info', `gzip ${gzs.toFixed(0)}KB（目標 ${gz}KB：screens.yaml）`)
}
if (only) for (let i = checks.length - 1; i >= 0; i--) { const c = checks[i]; const m = /^(?:src\/)?screens\/([^/]+)/.exec(c.file); if (m && !only.includes(m[1])) checks.splice(i, 1) }
const fail = checks.filter((c) => c.status === 'fail')
const out = { tool: 'konomi src-lint', generated_at: new Date().toISOString(), status: fail.length ? 'fail' : 'pass', counts: { fail: fail.length, warn: checks.filter((c) => c.status === 'warn').length, info: checks.filter((c) => c.status === 'info').length, repeated_class_groups: dups.length }, checks }
fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'src-report.json'), JSON.stringify(out, null, 2))
console.log(`src-lint: ${out.status}（fail ${fail.length}、warn ${out.counts.warn}、info ${out.counts.info}、同じクラスの並び ${dups.length} 組）`)
for (const c of fail.slice(0, 30)) console.log(`  ✗ ${c.id} ${c.file} ${c.detail}`)
for (const c of checks.filter((x) => x.status === 'warn').slice(0, 30)) console.log(`  ! ${c.id} ${c.file} ${c.detail}`)
process.exit(fail.length ? 1 : 0)
