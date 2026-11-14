import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = __dirname
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : [p]
  })
const source = files(root).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
const rel = (f: string) => relative(root, f)
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
const imports = (f: string) => [...readFileSync(f, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]).filter((s) => s.startsWith('.'))

/**
 * 層ごとに取り込んでよい行き先（トークン ← lib ← ui ← parts ← app ← screens）。
 * lib（数・日付の整形、入力の読み）は最下層で、ui と data の両方から取り込まれる（決定 8）。ui が data を取り込む例外は無くなった。
 */
const allowed: Record<string, RegExp> = {
  lib: /^\.\/[A-Za-z]+$/,
  ui: /^(\.\/[A-Za-z]+|\.\.\/lib)$/,
  data: /^(\.\/[A-Za-z]+|\.\.\/lib(\/format)?)$/,
  parts: /^(\.\/[A-Za-z]+|\.\.\/ui|\.\.\/data|\.\.\/lib)$/,
  app: /^(\.\/[A-Za-z]+|\.\.\/ui|\.\.\/data|\.\.\/parts|\.\.\/lib)$/,
}

describe('[REQ-028] 層の向きを逆に取り込まない', () => {
  for (const layer of Object.keys(allowed)) {
    it(`${layer} は下の層の入口だけを取り込む`, () => {
      const bad: string[] = []
      for (const f of source.filter((x) => rel(x).startsWith(layer + '/'))) {
        for (const spec of imports(f)) if (!allowed[layer].test(spec)) bad.push(`${rel(f)} → ${spec}`)
      }
      expect(bad).toEqual([])
    })
  }
  it('画面は別の画面を取り込まない', () => {
    const bad: string[] = []
    for (const f of source.filter((x) => rel(x).startsWith('screens/'))) {
      for (const spec of imports(f)) {
        const m = /^\.\.\/([^/]+)/.exec(spec)
        if (m && m[1] !== '..' && !['app', 'ui', 'parts', 'data', 'lib'].includes(m[1])) bad.push(`${rel(f)} → ${spec}`)
      }
    }
    expect(bad).toEqual([])
  })
})

describe('[REQ-028] 値を直書きしない', () => {
  const code = source.map((f) => ({ f: rel(f), text: stripComments(readFileSync(f, 'utf8')) }))
  it('任意値・色の直書き・素の文字サイズや角丸や影を使わない', () => {
    const bad: string[] = []
    for (const { f, text } of code) {
      for (const m of text.matchAll(/[a-z@:-]+-\[[^\]\s]+\]/g)) bad.push(`${f}: ${m[0]}`)
      for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)) bad.push(`${f}: ${m[0]}`)
      for (const m of text.matchAll(/\b(text-(xs|sm|base|lg|xl|[2-9]xl)|rounded-(sm|md|lg|xl|2xl|3xl|full)|shadow-(xs|sm|md|lg|xl)|font-(medium|semibold|light|extrabold))\b/g)) bad.push(`${f}: ${m[0]}`)
      for (const m of text.matchAll(/\b(bg|text|border)-(red|green|blue|gray|slate|zinc|neutral|amber|yellow|orange|indigo|violet|purple|pink|rose|sky|cyan|teal|emerald|black|white)\b/g)) bad.push(`${f}: ${m[0]}`)
      if (/!important|style=\{\{/.test(text)) bad.push(`${f}: !important か style 属性`)
    }
    expect(bad).toEqual([])
  })
  it('余白は刻み（4・8・12・16・24・32・48・80）の段だけ', () => {
    const step = new Set(['0', '1', '2', '3', '4', '6', '8', '12', '20'])
    const bad: string[] = []
    for (const { f, text } of code) {
      for (const word of text.split(/[\s'"`]+/)) {
        const m = /^(?:[a-z@0-9]+:)*-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(\d+(?:\.\d+)?)$/.exec(word)
        if (m && !step.has(m[1])) bad.push(`${f}: ${word}`)
      }
    }
    expect(bad).toEqual([])
  })
  it('時間とイージングはトークンから（秒数・cubic-bezier を直書きしない）', () => {
    const bad: string[] = []
    for (const { f, text } of code) for (const m of text.matchAll(/\b(?:duration|delay)-\d+|cubic-bezier|ease-(?:in|out|linear)\b/g)) bad.push(`${f}: ${m[0]}`)
    expect(bad).toEqual([])
  })
})

describe('[REQ-010] 配信：外部の読み込みが無い', () => {
  it('index.html は lang=ja で、ソースに外部 URL の読み込みが無い', () => {
    expect(readFileSync(join(root, '..', 'index.html'), 'utf8')).toMatch(/<html lang="ja"/)
    const bad: string[] = []
    for (const f of source) {
      const t = stripComments(readFileSync(f, 'utf8'))
      if (/(?:src|href)=["']https?:\/\/|@import\s+url\(|from 'https?:/.test(t)) bad.push(rel(f))
    }
    expect(bad).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// 機械の番人（第1.5段）。teamwork.md B-06：ソースを読んで測れる約束を、土台と同時にテストにして渡す。
// どの検査も、通る例と落ちる例の両方で試す（下の fixture）。例外を作るときは理由を書き、3 つを超えたら層の切り方を見直す。
// ---------------------------------------------------------------------------------------------

const yamlText = readFileSync(join(root, '..', '.konomi', 'screens.yaml'), 'utf8')
const list = (s: string | undefined) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean)

type ScreenSpec = { id: string; slug: string; kind: string; states: string[]; none: Record<string, string>; covers?: string[] }
/** screens.yaml の画面の行を、決まった書き方のまま読む（依存を足さない）。 */
function readScreens(yaml: string): ScreenSpec[] {
  const body = yaml.slice(yaml.indexOf('\nscreens:'), yaml.indexOf('\ncomponents:'))
  return body.split(/\n {2}(?=SCR-\d+:)/).slice(1).filter((b) => !/\n {4}kind:\s*sample\b/.test(b)).map((b) => ({
    id: /^(SCR-\d+):/.exec(b)?.[1] ?? '',
    slug: /path:\s*\?screen=([\w-]+)/.exec(b)?.[1] ?? '',
    kind: /\n {4}kind:\s*(\w+)/.exec(b)?.[1] ?? '',
    states: list(/\n {4}states:\s*\[([^\]]*)\]/.exec(b)?.[1]),
    none: Object.fromEntries([...b.matchAll(/\n {6}(\w+):\s*"([^"]*)"/g)].map((m) => [m[1], m[2]])),
    covers: list(/\n {4}covers:\s*\[([^\]]*)\]/.exec(b)?.[1]),
  }))
}
const screensSpec = readScreens(yamlText)

/** states.md E-02 の共通の語彙（語彙表と trace-check の 2 か所と同じ内容）。 */
const COMMON_STATES = ['default', 'empty', 'loading', 'error', 'forbidden', 'many', 'partial', 'offline', 'not_found', 'locked', 'confirming',
  'filtered_empty', 'invalid', 'saving', 'save_failed', 'done', 'resumed', 'conflict', 'expired', 'refreshing', 'stale']

/** BT-02：画面ファイルの形（teamwork.md B-04）。問題の文を返す。空なら合格。spec が無い見本（probe）は ID の形だけ見る。 */
export function checkScreenFile(text: string, spec?: ScreenSpec): string[] {
  const code = stripComments(text)
  const bad: string[] = []
  const scr = [...code.matchAll(/data-scr="([^"]+)"/g)].map((m) => m[1])
  if (scr.length !== 1) bad.push(`data-scr は文字のまま 1 つ（${scr.length} 個）`)
  else if (!/^SCR-\d{3}$/.test(scr[0])) bad.push(`data-scr の形が違う: ${scr[0]}`)
  else if (spec && scr[0] !== spec.id) bad.push(`data-scr が ${scr[0]}（screens.yaml は ${spec.id}）`)
  if ((code.match(/<AppShell\b/g) ?? []).length !== 1) bad.push('いちばん外は AppShell を 1 つ')
  if (/<main\b/.test(code)) bad.push('<main> は AppShell だけが持つ')
  if (/<h1\b/.test(code)) bad.push('h1 は AppShell が出す')
  if (!/\bstate=\{state\}/.test(code) || !/\bstates=\{STATES\}/.test(code)) bad.push('AppShell に state={state} と states={STATES} を渡す')
  const kind = /\bkind="(view|form)"/.exec(code)?.[1]
  if (!kind) bad.push('AppShell の kind="view" か kind="form" を文字で書く')
  const exp = /export const screen: ScreenDef = \{([^}]*)\}/.exec(code)?.[1]
  if (!exp) bad.push('export const screen: ScreenDef = { … } が無い')
  else {
    const field = (k: string) => new RegExp(`\\b${k}:\\s*'([^']+)'`).exec(exp)?.[1]
    if (!/\bstates:\s*\[\.\.\.STATES\]/.test(exp)) bad.push('screen.states は [...STATES]')
    if (field('kind') !== kind) bad.push(`screen.kind（${field('kind')}）と AppShell の kind（${kind}）が違う`)
    if (spec) {
      if (field('id') !== spec.id) bad.push(`screen.id が ${field('id')}（screens.yaml は ${spec.id}）`)
      if (field('slug') !== spec.slug) bad.push(`screen.slug が ${field('slug')}（screens.yaml は ${spec.slug}）`)
      if (kind !== spec.kind) bad.push(`kind が ${kind}（screens.yaml は ${spec.kind}）`)
    }
  }
  const states = list(/const STATES = \[([^\]]*)\] as const/.exec(code)?.[1]).map((x) => x.replace(/['"]/g, ''))
  if (states.length === 0) bad.push('const STATES = [ … ] as const が無い')
  else if (spec) {
    // save_failed は第 1 段で screens.yaml に足した。画面が第 2 段で足すまでは、画面に無くても許す（足したあとは位置まで合わせる）。
    const expected = states.includes('save_failed') ? spec.states : spec.states.filter((s) => s !== 'save_failed')
    if (states.join() !== expected.join()) bad.push(`STATES が screens.yaml の states と違う（${states.join(',')} ／ ${spec.states.join(',')}）`)
  }
  return bad
}

describe('[REQ-028] BT-02 画面ファイルの形（見本は通り、悪い例は落ちる）', () => {
  const spec: ScreenSpec = { id: 'SCR-002', slug: 'invoices', kind: 'view', states: ['default', 'loading'], none: {} }
  const good = `const STATES = ['default', 'loading'] as const
function Invoices({ state }: { state: string }) {
  return <AppShell data-scr="SCR-002" state={state} states={STATES} title="請求書" current="invoices" kind="view">x</AppShell>
}
export const screen: ScreenDef = { id: 'SCR-002', slug: 'invoices', title: '請求書', kind: 'view', states: [...STATES], Component: Invoices }`
  it('見本は通る', () => expect(checkScreenFile(good, spec)).toEqual([]))
  it('ID が文字でない／違う', () => {
    expect(checkScreenFile(good.replace('data-scr="SCR-002"', 'data-scr={ID}'), spec).join()).toContain('data-scr は文字のまま')
    expect(checkScreenFile(good.replace('data-scr="SCR-002"', 'data-scr="SCR-003"'), spec).join()).toContain('data-scr が SCR-003')
  })
  it('kind が無い・食い違う', () => {
    expect(checkScreenFile(good.replace(' kind="view">', '>'), spec).join()).toContain('kind=')
    expect(checkScreenFile(good.replace('kind="view">', 'kind="form">'), spec).join()).toContain('kind が form')
  })
  it('状態が screens.yaml と違う・<main> を自分で書く', () => {
    expect(checkScreenFile(good.replace("'loading'", "'error'"), spec).join()).toContain('STATES が screens.yaml')
    expect(checkScreenFile(good.replace('>x<', '><main>x</main><'), spec).join()).toContain('<main>')
  })
  it('実物：probe 以外の画面ファイルは screens.yaml と一致し、probe は形だけ守る', () => {
    const bad: string[] = []
    for (const f of source.filter((x) => /screens\/[^/]+\/index\.tsx$/.test(rel(x).replace(/\\/g, '/')))) {
      const slug = rel(f).replace(/\\/g, '/').split('/')[1]
      const spec = screensSpec.find((s) => s.slug === slug)
      if (!spec && !slug.startsWith('probe')) bad.push(`${slug}: screens.yaml に無い画面`)
      for (const p of checkScreenFile(readFileSync(f, 'utf8'), spec)) bad.push(`${slug}: ${p}`)
    }
    expect(bad).toEqual([])
  })
})

describe('[REQ-001] screens.yaml の画面の種類と状態の名前（states.md E-02・E-03）', () => {
  const extra = [...(/\nextra_states:\n((?: {2}- .*\n?)+)/.exec(yamlText)?.[1] ?? '').matchAll(/- (\w+)/g)].map((m) => m[1])
  it('全画面に kind（view か form）がある', () => {
    expect(screensSpec).toHaveLength(10)
    expect(screensSpec.filter((s) => s.kind !== 'view' && s.kind !== 'form').map((s) => s.id)).toEqual([])
  })
  it('全画面に id・slug・covers があり、states の先頭は default', () => {
    expect(screensSpec.filter((s) => !s.id || !s.slug || !(s.covers && s.covers.length) || s.states[0] !== 'default').map((s) => s.id)).toEqual([])
  })
  it('STATE-NAME：states は共通の語彙か extra_states。共通の語は extra_states に書かない。名前は小文字・下線・英語 1〜2 語', () => {
    const known = new Set([...COMMON_STATES, ...extra])
    const bad: string[] = []
    for (const s of screensSpec) for (const st of s.states) if (!known.has(st)) bad.push(`${s.id}: ${st} は語彙に無い`)
    for (const e of extra) {
      if (COMMON_STATES.includes(e)) bad.push(`extra_states に共通の語 ${e}`)
      if (!/^[a-z]+(_[a-z0-9]+)?$/.test(e)) bad.push(`名前の形が違う: ${e}`)
    }
    expect(bad).toEqual([])
  })
  it('STATE-NAME：画面固有の名前は 1 画面 5 個以下、3 画面以上で使う名前は共通の語に足す', () => {
    const bad: string[] = []
    for (const s of screensSpec) {
      const own = s.states.filter((st) => !COMMON_STATES.includes(st))
      if (own.length > 5) bad.push(`${s.id}: 固有の名前が ${own.length} 個`)
    }
    for (const e of extra) {
      const n = screensSpec.filter((s) => s.states.includes(e)).length
      if (n === 0) bad.push(`${e} をどの画面も使わない`)
      if (n >= 3) bad.push(`${e} を ${n} 画面が使う（共通の語に足す）`)
    }
    expect(bad).toEqual([])
  })
  it('STATE-NONE：none の理由は数字・「必ず」「固定」・REQ の ID のどれかを含む。通信がある画面の loading・error は none にしない', () => {
    const bad: string[] = []
    for (const s of screensSpec) {
      for (const [k, why] of Object.entries(s.none)) {
        if (!/\d|必ず|固定|REQ-\d+/.test(why)) bad.push(`${s.id}.${k}: 理由が数字・必ず・固定・REQ のどれも含まない「${why}」`)
        if (s.states.includes(k)) bad.push(`${s.id}.${k}: states と none の両方にある`)
      }
      for (const k of ['loading', 'error']) if (s.none[k]) bad.push(`${s.id}: 通信がある画面で ${k} を none にできない`)
      for (const k of ['empty', 'loading', 'error', 'forbidden', 'many']) if (!s.states.includes(k) && !s.none[k]) bad.push(`${s.id}: ${k} を扱うか none に理由を書く`)
    }
    expect(bad).toEqual([])
  })
  it('STATE-NONE の判定は「不要」だけの理由を落とす', () => {
    expect(/\d|必ず|固定|REQ-\d+/.test('不要')).toBe(false)
    expect(/\d|必ず|固定|REQ-\d+/.test('全員が同じ権限（REQ-011）')).toBe(true)
  })
})

/** 数え始め（(map.get(k) ?? 0) + 1）。欠損を 0 にするのではなく、まだ数えていない物を 0 から数える。 */
const COUNT_UP = /\([^?]*\?\?\s*0\s*\)\s*\+\s*\d/
const RE = {
  intl: /\bIntl\.|toLocale(?:String|DateString|TimeString)\(/g,
  money: /¥|￥|[０-９]/g,
  reorder: /(?:^|[^\w-])(?:[a-z0-9@]+:)*order-(?:first|last|none|-?\d+)\b|\bflex-(?:col|row)-reverse\b|\bcol-reverse\b/g,
  placeholder: /<(?:TextInput|Textarea|input)\b[^>]*\bplaceholder=/g,
  numberType: /type=(?:"number"|\{?'number'\}?)/g,
  dialogActions: /<Dialog\b[^>]*\bactions=/g,
}
const zeroFill = (l: string) => /(\?\?|\|\|)\s*0\b/.test(l) && !COUNT_UP.test(l)

describe('[REQ-028] ソースの検査：色・図・数・順序（部品ごとの「機械で確かめられること」）', () => {
  const code = source.map((f) => ({ f: rel(f).replace(/\\/g, '/'), text: stripComments(readFileSync(f, 'utf8')) }))
  const find = (re: RegExp, only?: (f: string) => boolean) => code.filter((c) => !only || only(c.f)).flatMap((c) => [...c.text.matchAll(re)].map((m) => `${c.f}: ${m[0]}`))

  it('DAT-03 欠損を ?? 0・|| 0 で 0 にしない（数え始めの (x ?? 0) + 1 だけ許す。例外 2 か所）', () => {
    const bad = code.flatMap((c) => c.text.split('\n').filter(zeroFill).map((l) => `${c.f}: ${l.trim().slice(0, 60)}`))
    expect(bad).toEqual([])
    const allowed = code.flatMap((c) => c.text.split('\n').filter((l) => COUNT_UP.test(l)))
    expect(allowed.length).toBeLessThanOrEqual(3)
  })
  it('DAT-03 の判定：欠損を 0 にする書き方を落とし、数え始めは通す', () => {
    expect(zeroFill('const v = row.amount ?? 0')).toBe(true)
    expect(zeroFill('total = total || 0')).toBe(true)
    expect(zeroFill('count.set(t, (count.get(t) ?? 0) + 1)')).toBe(false)
  })
  it('M-20 / G-05：Intl と toLocaleString は lib/format.ts だけ。¥ と全角数字を文字に使わない', () => {
    expect(find(RE.intl, (f) => f !== 'lib/format.ts')).toEqual([])
    expect(find(RE.money)).toEqual([])
  })
  it('G-05：負の符号は U+2212 に替える処理が format.ts にある', () => {
    const fmt = readFileSync(join(root, 'lib', 'format.ts'), 'utf8')
    expect(fmt).toMatch(/MINUS\s*=\s*'\\u2212'/)
    expect(fmt).toMatch(/replace\(\/\^\[-\\u2212\]\/, MINUS\)/)
  })
  it('S-10：見た目の順だけを入れ替えない（order・flex-*-reverse を使わない）', () => {
    expect(find(RE.reorder)).toEqual([])
  })
  it('CK-02・CK-03 札：調子ごとに絵が別。札の中で回さない。回る絵は Spinner だけ、画面に 1 つまで', () => {
    const tag = code.find((c) => c.f === 'ui/StatusTag.tsx')!.text
    const icons = [...tag.matchAll(/icon:\s*'([\w-]+)'/g)].map((m) => m[1])
    expect(icons).toHaveLength(6)
    expect(new Set(icons).size).toBe(6)
    expect(tag).not.toMatch(/animate-|spin/)
    expect(find(/animate-spin/g, (f) => f !== 'ui/Spinner.tsx')).toEqual([])
    expect(find(/<Spinner\b|\bSpinner\b/g, (f) => f.startsWith('parts/'))).toEqual([])
    const perScreen = code.filter((c) => c.f.startsWith('screens/')).map((c) => [c.f, (c.text.match(/<Spinner\b/g) ?? []).length] as const).filter(([, n]) => n > 1)
    expect(perScreen).toEqual([])
  })
  it('FC-01・FC-03：入力欄に placeholder を付けない。type=number にしない', () => {
    expect(find(RE.placeholder)).toEqual([])
    expect(find(RE.numberType)).toEqual([])
  })
  it('I-09：Enter で送るなら変換確定の Enter を除く（isComposing）', () => {
    const bad = code.filter((c) => /key\s*===?\s*'Enter'/.test(c.text) && !/isComposing/.test(c.text)).map((c) => c.f)
    expect(bad).toEqual([])
  })
  it('S-04・B-04：AppShell の kind は必須。Dialog の操作は secondary と primary で渡す（actions で順を壊さない）', () => {
    expect(readFileSync(join(root, 'app', 'AppShell.tsx'), 'utf8')).toMatch(/\n\s+kind: ScreenKind\n/)
    expect(find(RE.dialogActions)).toEqual([])
  })
})

describe('[REQ-028] 番人の判定そのもの：悪い例で落ち、良い例で通る（B-06）', () => {
  const hits = (re: RegExp, text: string) => (text.match(new RegExp(re.source, re.flags.replace('g', ''))) ? 1 : 0)
  it.each([
    ['intl', "new Intl.NumberFormat('ja-JP')", 'formatNumber(n)'],
    ['intl', 'n.toLocaleString()', 'n.toString()'],
    ['money', "'¥1,200'", "'1,200円'"],
    ['money', "'１２００円'", "'1200円'"],
    ['reorder', 'className="order-last flex"', 'className="border-line flex"'],
    ['reorder', 'className="md:order-2"', 'className="border-b"'],
    ['reorder', 'className="flex-col-reverse"', 'className="flex-col"'],
    ['placeholder', '<TextInput placeholder="例" />', '<TextInput aria-label="検索" />'],
    ['numberType', '<input type="number" />', '<input inputMode="numeric" />'],
    ['dialogActions', '<Dialog open actions={<b/>}>', '<Dialog open secondary={<b/>} primary={<b/>}>'],
  ] as const)('%s：%s は落ち、%s は通る', (name, badText, goodText) => {
    expect(hits(RE[name], badText)).toBe(1)
    expect(hits(RE[name], goodText)).toBe(0)
  })
})

// ---------------------------------------------------------------------------------------------
// 同じ決めごとの別実装を画面に作らせない番人（第3回の振り返り C。土台に引き上げた物を、画面が作り直さない）。
// いまの画面（第 1 段では書き換えない）は一覧を出すだけで落とさず、新しい違反だけ落とす（ratchet）。
// 第 2 段で画面を置き換えたら UPLIFT_STRICT を true にし、UPLIFT_KNOWN を空にする（docs/uplift-plan.md）。
// ---------------------------------------------------------------------------------------------

/** 画面の違反を検出する純粋な関数。名前つきで試せるようにここに置く。 */
export const UPLIFT_RULES = {
  /** history.replaceState／pushState を画面が直接呼ぶ（→ nav.replace・replaceParams・useUrlParam・go）。 */
  history: (text: string) => [...text.matchAll(/\bhistory\.(?:replaceState|pushState)\s*\(/g)].map((m) => m[0]),
  /** useLeaveGuard・useUrlParam（とその別名）を画面フォルダに置く（→ AppShell の dirty・app/nav の useUrlParam）。ファイル名と定義の両方を見る。 */
  hooks: (text: string) => [...text.matchAll(/\b(?:function|const)\s+(useLeaveGuard|useUrlParam|usePageParam)\b/g)].map((m) => m[1]),
  /** PAGE_SIZE を画面で定義する（→ ui の PAGE_SIZE・lib の paginate）。 */
  pageSize: (text: string) => [...text.matchAll(/\b(?:export\s+)?(?:const|let)\s+PAGE_SIZE\b/g)].map((m) => m[0]),
  /** 全角→半角の直しを画面が自前で書く（→ lib の toHalf・readDate・readYen）。 */
  nfkc: (text: string) => [...text.matchAll(/\.normalize\(\s*['"]NFKC['"]\s*\)/g)].map((m) => m[0]),
} as const

/** 画面の文言ファイルの名前は copy.ts（texts.ts・words.ts・windows.ts にしない）。 */
export const COPY_FILE_NAME = 'copy.ts'
export const isOtherCopyName = (file: string) => /^(?:texts|words|windows|strings|labels|messages)\.ts$/.test(file)
export const isHookFile = (file: string) => /^(?:useLeaveGuard|useUrlParam|usePageParam)\.tsx?$/.test(file)

/**
 * いまの画面にある違反（「ファイル: 種類」）。第 2 段で置き換えるたびに減らす。
 * UPLIFT_STRICT が false の間は、ここに無い新しい違反だけ落とす。
 */
const UPLIFT_STRICT = true
const UPLIFT_KNOWN: string[] = [
  'screens/client-form/texts.ts: copy-name texts.ts（copy.ts にする）',
  'screens/client-form/useLeaveGuard.ts: hooks useLeaveGuard',
  'screens/client-form/useLeaveGuard.ts: hook-file useLeaveGuard.ts',
  "screens/client-form/validate.ts: nfkc .normalize('NFKC')",
  'screens/clients/model.ts: pageSize export const PAGE_SIZE',
  "screens/clients/model.ts: nfkc .normalize('NFKC')",
  'screens/clients/useListQuery.ts: history history.replaceState(',
  'screens/invoice-detail/LinesSection.tsx: pageSize const PAGE_SIZE',
  "screens/invoice-detail/parse.ts: nfkc .normalize('NFKC')",
  'screens/invoice-detail/usePageParam.ts: history history.replaceState(',
  'screens/invoice-detail/usePageParam.ts: hooks usePageParam',
  'screens/invoice-detail/usePageParam.ts: hook-file usePageParam.ts',
  'screens/invoice-detail/windows.ts: copy-name windows.ts（copy.ts にする）',
  "screens/invoice-new/dateInput.ts: nfkc .normalize('NFKC')",
  "screens/invoice-new/formLogic.ts: nfkc .normalize('NFKC')",
  "screens/invoice-new/numberInput.ts: nfkc .normalize('NFKC')",
  'screens/invoice-new/useLeaveGuard.ts: hooks useLeaveGuard',
  'screens/invoice-new/useLeaveGuard.ts: hook-file useLeaveGuard.ts',
  'screens/invoices/query.ts: pageSize export const PAGE_SIZE',
  "screens/invoices/query.ts: nfkc .normalize('NFKC')",
  'screens/invoices/useInvoiceQuery.ts: history history.replaceState(',
  'screens/payments/index.tsx: pageSize const PAGE_SIZE',
  "screens/payments/logic.ts: nfkc .normalize('NFKC')",
  'screens/payments/useUrlParam.ts: history history.replaceState(',
  'screens/payments/useUrlParam.ts: hooks useUrlParam',
  'screens/payments/useUrlParam.ts: hook-file useUrlParam.ts',
  'screens/payments/words.ts: copy-name words.ts（copy.ts にする）',
  'screens/report/aggregate.ts: pageSize export const PAGE_SIZE',
  'screens/report/texts.ts: copy-name texts.ts（copy.ts にする）',
  'screens/report/useUrlParam.ts: history history.replaceState(',
  'screens/report/useUrlParam.ts: hooks useUrlParam',
  'screens/report/useUrlParam.ts: hook-file useUrlParam.ts',
  "screens/settings/model.ts: nfkc .normalize('NFKC')",
  'screens/settings/useLeaveGuard.ts: hooks useLeaveGuard',
  'screens/settings/useLeaveGuard.ts: hook-file useLeaveGuard.ts',
  'screens/settings/useSettingsForm.ts: history history.replaceState(',
  'screens/settings/words.ts: copy-name words.ts（copy.ts にする）',
  "screens/setup/model.ts: nfkc .normalize('NFKC')",
]

describe('[REQ-028] 画面が土台に上げた物を作り直さない（いまは一覧を出すだけ。新しい違反は落とす）', () => {
  const screenCode = source
    .filter((f) => rel(f).replace(/\\/g, '/').startsWith('screens/'))
    .map((f) => ({ f: rel(f).replace(/\\/g, '/'), text: stripComments(readFileSync(f, 'utf8')) }))
  const found = (): string[] => {
    const out: string[] = []
    for (const { f, text } of screenCode) {
      const file = f.split('/').pop() ?? ''
      for (const [name, rule] of Object.entries(UPLIFT_RULES)) for (const hit of new Set(rule(text))) out.push(`${f}: ${name} ${hit}`)
      if (isHookFile(file)) out.push(`${f}: hook-file ${file}`)
      if (isOtherCopyName(file)) out.push(`${f}: copy-name ${file}（${COPY_FILE_NAME} にする）`)
    }
    return out
  }
  it('[todo] history の直接呼び・useLeaveGuard/useUrlParam の自作・PAGE_SIZE の定義・NFKC の直書き・文言ファイルの名前', () => {
    const all = found()
    if (all.length > 0) console.info(`[todo] 画面が作り直している物 ${all.length} 件（第 2 段で土台の物に置き換える。docs/uplift-plan.md）\n${all.join('\n')}`)
    if (UPLIFT_STRICT) expect(all).toEqual([])
    else expect(all.filter((a) => !UPLIFT_KNOWN.includes(a))).toEqual([])
  })
  it('番人の判定そのもの：悪い例は見つかり、土台の物を使う書き方は通る', () => {
    expect(UPLIFT_RULES.history('window.history.replaceState(null, "", url)')).toHaveLength(1)
    expect(UPLIFT_RULES.history('history.pushState(null, "", u)')).toHaveLength(1)
    expect(UPLIFT_RULES.history('replace("clients", { q })')).toEqual([])
    expect(UPLIFT_RULES.hooks('export function useLeaveGuard(a: boolean) {}')).toEqual(['useLeaveGuard'])
    expect(UPLIFT_RULES.hooks('const useUrlParam = () => 1')).toEqual(['useUrlParam'])
    expect(UPLIFT_RULES.hooks('const [q] = useUrlParam("q", "")')).toEqual([])
    expect(UPLIFT_RULES.pageSize('const PAGE_SIZE = 20')).toHaveLength(1)
    expect(UPLIFT_RULES.pageSize('export const PAGE_SIZE = 20')).toHaveLength(1)
    expect(UPLIFT_RULES.pageSize('paginate(rows, page, PAGE_SIZE)')).toEqual([])
    expect(UPLIFT_RULES.nfkc("s.normalize('NFKC')")).toHaveLength(1)
    expect(UPLIFT_RULES.nfkc('toHalf(s)')).toEqual([])
    expect(isHookFile('useLeaveGuard.ts')).toBe(true)
    expect(isHookFile('useClientForm.ts')).toBe(false)
    for (const bad of ['texts.ts', 'words.ts', 'windows.ts']) expect(isOtherCopyName(bad)).toBe(true)
    expect(isOtherCopyName('copy.ts')).toBe(false)
    expect(isOtherCopyName('texts.test.ts')).toBe(false)
  })
  it('土台の側は自分の番人に引っかからない（nav・useLeaveGuard が history を呼ぶのは土台だけ）', () => {
    const base = source.filter((f) => !rel(f).replace(/\\/g, '/').startsWith('screens/')).map((f) => rel(f).replace(/\\/g, '/'))
    const calling = base.filter((f) => UPLIFT_RULES.history(stripComments(readFileSync(join(root, f), 'utf8'))).length > 0)
    expect(calling.sort()).toEqual(['app/nav.ts', 'app/useLeaveGuard.ts'])
  })
})

describe('[REQ-028] 手引きと実物の一致（teamwork.md B-05：古い手引きは無い手引きより悪い）', () => {
  const guide = readFileSync(join(root, '..', 'docs', 'guide-for-screens.md'), 'utf8')
  const exportsOf = (file: string): string[] =>
    [...readFileSync(join(root, file), 'utf8').matchAll(/export \{([^}]*)\}/g)].flatMap((m) => m[1].split(',').map((x) => x.trim()).filter((x) => x && !x.startsWith('type '))).map((x) => x.replace(/ as .*/, ''))
  it('ui と parts の入口が出す名前が、手引きの部品の表にすべてある', () => {
    const missing = [...exportsOf('ui/index.ts'), ...exportsOf('parts/index.ts')].filter((n) => !guide.includes(n))
    expect(missing).toEqual([])
  })
  it('骨格の部品と、整形の関数が手引きにある', () => {
    const fnames = (file: string) => [...readFileSync(join(root, file), 'utf8').matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1])
    const lib = ['lib/format.ts', 'lib/normalize.ts', 'lib/paginate.ts', 'lib/check.ts'].flatMap(fnames)
    const base = [...fnames('app/nav.ts'), ...fnames('data/fakeSave.ts'), 'AppShell', 'Link', 'LinkButton', 'LeaveDialog', 'StaleNotice', 'RefreshingNote', 'messages', 'screenNames', 'navItems', 'actions', 'useFake', 'ScreenKind']
    const missing = [...lib, ...base].filter((n) => !guide.includes(n))
    expect(missing).toEqual([])
  })
  it('手引きは 0〜8 の 9 見出し（B-05 の型）で、画面ファイルの見本は BT-02 を通る', () => {
    expect([...guide.matchAll(/^## (\d)\. /gm)].map((m) => m[1])).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8'])
    const sample = /```tsx\n(const STATES[\s\S]*?)```/.exec(guide)?.[1] ?? ''
    // 手引きの見本は …（省略）を含むので、形に関わる部分だけで確かめる
    const spec = screensSpec.find((s) => s.id === 'SCR-002')!
    expect(checkScreenFile(sample, spec)).toEqual([])
  })
  it('禁止事項は 5〜8 個', () => {
    const body = /## 1\. [\s\S]*?\n## 2\./.exec(guide)?.[0] ?? ''
    const n = [...body.matchAll(/^\d+\. /gm)].length
    expect(n).toBeGreaterThanOrEqual(5)
    expect(n).toBeLessThanOrEqual(8)
  })
})
