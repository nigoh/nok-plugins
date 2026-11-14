#!/usr/bin/env node
// konomi bundle-budget：読み込む量の目標を確かめる（M-29）。
// 測る物は「全画面の合計」ではなく、①最初に読む量（入口の JS＋CSS＋入口が必ず読む共有の塊）と ②画面 1 枚を開くときに足される量。どちらも gzip。
// 使い方: node bundle-budget.mjs <リポジトリのルート> <分けて作った dist のフォルダ> [--out <evidence の出し先>]
//   dist は「画面ごとに分けた」作り方の出力（1 枚に固めた HTML は試作・共有用で、この検査の対象外）。
// 目標は .konomi/screens.yaml の targets.budget から読む（無ければ下の既定値。〔目安〕）:
//   targets: { budget: { first_load_gzip_kb: 150, screen_gzip_kb: 20, note: "..." } }
// 足した外部の部品（ログイン・監視・入力検査など）で増えた分は、targets.budget.added に 1 行ずつ書く（何を・なぜ・何 KB）。
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'
const DEFAULT = { first_load_gzip_kb: 150, screen_gzip_kb: 15 }
const args = process.argv.slice(2); const root = path.resolve(args[0] || '.'); const dist = path.resolve(args[1] || path.join(root, 'dist'))
const outDir = args.includes('--out') ? path.resolve(args[args.indexOf('--out') + 1]) : path.join(root, 'evidence')
let budget = { ...DEFAULT }
try { const y = (await import('yaml')).default.parse(fs.readFileSync(path.join(root, '.konomi', 'screens.yaml'), 'utf8')); Object.assign(budget, y?.targets?.budget || {}) } catch {}
const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : []
const files = walk(dist).filter((f) => /\.(js|css)$/.test(f))
if (!files.length) { console.log('bundle-budget: dist に JS / CSS がありません（画面ごとに分けた作り方で build してください）'); process.exit(2) }
const gz = (f) => zlib.gzipSync(fs.readFileSync(f)).length / 1000
const html = walk(dist).find((f) => f.endsWith('.html')); const page = html ? fs.readFileSync(html, 'utf8') : ''
const inHtml = (f) => page.includes(path.basename(f))
const text = Object.fromEntries(files.filter((f) => f.endsWith('.js')).map((f) => [f, fs.readFileSync(f, 'utf8')]))
// 入口が必ず読む物：HTML が指す JS / CSS と、その JS が「静的に」取り込む塊（import"./x.js" / from"./x.js"）。import("./x.js") は遅れて読むので数えない。
const first = new Set(files.filter(inHtml))
const staticDeps = (f) => [...(text[f] || '').matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g)].map((m) => path.join(path.dirname(f), m[1]))
for (let grew = true; grew;) { grew = false; for (const f of [...first]) for (const d of staticDeps(f)) if (fs.existsSync(d) && !first.has(d)) { first.add(d); grew = true } }
const firstKb = [...first].reduce((n, f) => n + gz(f), 0)
// 遅れて読む塊のうち、2 つ以上の画面が共通で使う物は「共有」。最初の 1 画面を開くときに一緒に読まれる。
const lazyFiles = files.filter((f) => f.endsWith('.js') && !first.has(f))
const usedBy = new Map(); for (const f of lazyFiles) for (const d of staticDeps(f)) if (lazyFiles.includes(d)) usedBy.set(d, (usedBy.get(d) || 0) + 1)
const shared = lazyFiles.filter((f) => (usedBy.get(f) || 0) >= 2); const sharedKb = shared.reduce((n, f) => n + gz(f), 0)
const lazy = lazyFiles.filter((f) => !shared.includes(f)).map((f) => ({ file: path.basename(f), own: gz(f), withDeps: gz(f) + staticDeps(f).filter((d) => lazyFiles.includes(d) && !shared.includes(d)).reduce((n, d) => n + gz(d), 0) })).sort((a, b) => b.withDeps - a.withDeps)
const short = (n) => n.replace(/-[\w-]{8}\./, '.')
const firstView = firstKb + sharedKb + (lazy[0] ? lazy[0].withDeps : 0)
const checks = []
checks.push({ id: 'budget-first-load', status: firstView <= budget.first_load_gzip_kb ? 'pass' : 'fail', detail: `最初の 1 画面を開くまでに読む量 ${firstView.toFixed(1)}KB（gzip。目標 ${budget.first_load_gzip_kb}KB）＝入口 ${firstKb.toFixed(1)}（${[...first].map((f) => short(path.basename(f)) + ' ' + gz(f).toFixed(1)).join('、')}）＋画面が共通で使う塊 ${sharedKb.toFixed(1)}（${shared.length} 個）＋いちばん大きい画面 ${lazy[0] ? lazy[0].withDeps.toFixed(1) : 0}` })
const over = lazy.filter((l) => l.withDeps > budget.screen_gzip_kb)
checks.push({ id: 'budget-per-screen', status: over.length ? 'fail' : 'pass', detail: over.length ? `目標 ${budget.screen_gzip_kb}KB を超える画面の塊: ` + over.map((l) => `${short(l.file)} ${l.withDeps.toFixed(1)}`).join('、') : `画面の塊 ${lazy.length} 個。最大 ${lazy[0] ? short(lazy[0].file) + ' ' + lazy[0].withDeps.toFixed(1) : 0}KB、中央 ${lazy.length ? lazy[Math.floor(lazy.length / 2)].withDeps.toFixed(1) : 0}KB（目標 ${budget.screen_gzip_kb}KB）` })
if (!lazyFiles.length) checks.push({ id: 'budget-split', status: 'fail', detail: '遅れて読む塊が 0 個。画面が分かれていない（全画面を最初に読んでいる）' })
const out = { tool: 'konomi bundle-budget', generated_at: new Date().toISOString(), status: checks.some((c) => c.status === 'fail') ? 'fail' : 'pass', budget, first_load_gzip_kb: +firstView.toFixed(1), entry_gzip_kb: +firstKb.toFixed(1), shared_gzip_kb: +sharedKb.toFixed(1), lazy_chunks: lazy.map((l) => ({ file: l.file, gzip_kb: +l.withDeps.toFixed(1) })), checks }
fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, 'bundle-report.json'), JSON.stringify(out, null, 2))
console.log(`bundle-budget: ${out.status}`); for (const c of checks) console.log(`  ${c.status === 'pass' ? '✓' : '✗'} ${c.id} ${c.detail}`)
process.exit(out.status === 'pass' ? 0 : 1)
