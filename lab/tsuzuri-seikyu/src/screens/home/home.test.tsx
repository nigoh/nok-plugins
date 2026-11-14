import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clients, invoices, TODAY } from '../../data'
import { ToastProvider } from '../../ui'
import { HomeBody } from './HomeBody'
import { screen as homeScreen } from './index'
import { LONGEST_CLIENT_NAME } from './sampleVariants'
import { ACTIVITY_LIMIT } from './summary'

const Home = homeScreen.Component
const renderHome = (state = 'default') => render(<ToastProvider><Home state={state} /></ToastProvider>)

/** 画面の幅を替える（jsdom には matchMedia が無い）。(min-width: Npx) の問いにだけ答える。 */
function setWidth(px: number) {
  window.matchMedia = ((q: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(q)?.[1] ?? 0)
    return { matches: px >= min, media: q, addEventListener: () => {}, removeEventListener: () => {} }
  }) as unknown as typeof window.matchMedia
}
afterEach(() => {
  cleanup()
  Reflect.deleteProperty(window, 'matchMedia')
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
})
const follows = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
const section = (name: string) => screen.getByRole('region', { name })
const STATES = ['default', 'loading', 'error', 'empty', 'todo_empty', 'many']

describe('[REQ-001] 共通の骨格', () => {
  it('[SCR-001:default] main は 1 つ、h1 は「ホーム」、メニューの現在地はホーム、主ボタンは 1 つ', () => {
    renderHome()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'ホーム' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: '主なメニュー' })).getByRole('link', { name: 'ホーム' })).toHaveAttribute('aria-current', 'page')
    const primary = screen.getAllByRole('link', { name: '請求書を作る' })
    expect(primary).toHaveLength(1)
    expect(primary[0]).toHaveAttribute('href', '?screen=invoice-new')
  })
  it.each(STATES)('[SCR-001:%s] どの状態でも、h1 と主ボタンが同じ形で残る（取得に失敗しても作り始められる）', (state) => {
    renderHome(state)
    expect(screen.getByRole('heading', { level: 1, name: 'ホーム' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: '請求書を作る' })).toHaveLength(1)
    expect(document.title).toBe('ホーム | つづり請求')
  })
  it('[SCR-001:default] 画面の ID・状態の一覧を data 属性で持つ（6 つ）', () => {
    const { container } = renderHome()
    const root = container.querySelector('[data-scr]')
    expect(root).toHaveAttribute('data-scr', 'SCR-001')
    expect(root).toHaveAttribute('data-states', STATES.join(' '))
    expect(homeScreen.states).toEqual(STATES)
    expect(homeScreen.kind).toBe('view')
  })
})

describe('[REQ-006] 幅 3 段階の見え方', () => {
  it('[SCR-001:default] 1280px：主ボタンは見出しの右、メニューは左に縦', () => {
    setWidth(1280)
    renderHome()
    expect(within(screen.getByRole('main')).getByRole('link', { name: '請求書を作る' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '主なメニュー' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'メニュー' })).not.toBeInTheDocument()
  })
  it('[SCR-001:default] 375px：メニューは「メニュー」ボタンから、主ボタンは main のあと（下に固定）。項目は落ちない', () => {
    setWidth(375)
    renderHome()
    expect(screen.getByRole('button', { name: 'メニュー' })).toBeInTheDocument()
    const primary = screen.getByRole('link', { name: '請求書を作る' })
    expect(within(screen.getByRole('main')).queryByRole('link', { name: '請求書を作る' })).not.toBeInTheDocument()
    expect(follows(screen.getByRole('main'), primary)).toBe(true)
    // 狭い幅でも 3 つの区画と、行の中身（札・件数・補足）が全部ある
    for (const name of ['今日やること', '請求と入金の状況', '最近の動き']) expect(section(name)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /期限超過.*請求書.*最も古い支払期限は10\/31\(土\)、13日超過.*3件/ })).toBeInTheDocument()
  })
  it('[SCR-001:default] 区画は ul・dl で組み、固定の幅の表にしない（枠が狭くても行や数字が落ちない）', () => {
    renderHome()
    expect(within(section('今日やること')).getByRole('list')).toBeInTheDocument()
    expect(within(section('最近の動き')).getByRole('list')).toBeInTheDocument()
    expect(within(section('請求と入金の状況')).queryByRole('table')).not.toBeInTheDocument()
    expect(within(section('請求と入金の状況')).getAllByRole('term')).toHaveLength(3)
  })
})

describe('[REQ-012] ホーム', () => {
  it('[SCR-001:default] 「今日やること」が見出しの次の先頭にあり、件数つきで 3 行（期限超過・未確認の入金・下書き）', () => {
    renderHome()
    const h2s = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(h2s).toEqual(['今日やること', '請求と入金の状況', '最近の動き'])
    const rows = within(section('今日やること')).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getByRole('link', { name: /期限超過.*請求書.*3件/ })).toBeInTheDocument()
    expect(within(rows[1]).getByRole('link', { name: /未確認.*入金.*最も古い入金日は10\/15\(木\).*6件/ })).toBeInTheDocument()
    expect(within(rows[2]).getByRole('link', { name: /下書き.*請求書.*送ると番号が付き、相手に届きます.*2件/ })).toBeInTheDocument()
  })
  it('[SCR-001:default] 数字の順は DOM でも 今日やること → 数字 → 最近の動き', () => {
    renderHome()
    expect(follows(section('今日やること'), section('請求と入金の状況'))).toBe(true)
    expect(follows(section('請求と入金の状況'), section('最近の動き'))).toBe(true)
  })
  it('[SCR-001:default] 今月の請求額・未入金の額・期限超過の件数が、先月の同じ日と比べる言葉と時点つきで並ぶ', () => {
    renderHome()
    const m = section('請求と入金の状況')
    expect(within(m).getByText('2026年11月13日の09:30時点')).toBeInTheDocument()
    const terms = within(m).getAllByRole('term').map((t) => t.textContent)
    expect(terms).toEqual(['今月の請求額（税込）', '未入金の額（税込）', '期限超過の件数'])
    const group = (t: string) => within(within(m).getByText(t).parentElement as HTMLElement)
    expect(group('今月の請求額（税込）').getByText('476,100')).toBeInTheDocument()
    expect(group('今月の請求額（税込）').getByText('先月の13日までと比べて')).toBeInTheDocument()
    expect(group('今月の請求額（税込）').getByText('+7,500円（+2%）')).toBeInTheDocument()
    expect(group('未入金の額（税込）').getByText('1,457,500')).toBeInTheDocument()
    expect(group('未入金の額（税込）').getByText('9件')).toBeInTheDocument()
    expect(group('未入金の額（税込）').getByText('+544,700円（+60%）')).toBeInTheDocument()
    expect(group('期限超過の件数').getByText('先月の13日は0件でした')).toBeInTheDocument()
  })
  it('[SCR-001:default] 最近の動きは起きたことを「N時間前」で言い、24 時間以上は日付と時刻。件数の上限まで', () => {
    renderHome()
    const rows = within(section('最近の動き')).getAllByRole('listitem')
    expect(rows).toHaveLength(ACTIVITY_LIMIT)
    expect(within(rows[0]).getByText('入金を記録しました')).toBeInTheDocument()
    expect(within(rows[0]).getByText('東雲デザイン事務所・INV-2026-0027')).toBeInTheDocument()
    expect(within(rows[0]).getByText('21時間前')).toBeInTheDocument()
    expect(within(rows[1]).getByText('下書きを保存しました')).toBeInTheDocument()
    expect(within(rows[1]).getByText('株式会社アカシア電機')).toBeInTheDocument() // 下書きは番号が無い
    expect(within(rows[3]).getByText('11/11(水) 12:00')).toBeInTheDocument()
  })
  it('[SCR-001:default] 1 件だけの区画でも崩れない（件は数えない言葉）。0 件の行は出さない', () => {
    const d = { clients, payments: [], invoices: invoices.filter((i) => i.status === 'draft').slice(0, 1) }
    render(<HomeBody data={d} />)
    const rows = within(section('今日やること')).getAllByRole('listitem')
    expect(rows).toHaveLength(1)
    expect(within(rows[0]).getByRole('link', { name: /下書き.*1件/ })).toBeInTheDocument()
  })
  it('[SCR-001:default] 先月の記録が無いときは「先月の記録がありません」と言い、% を出さない（0 と別）', () => {
    const d = { clients, payments: [], invoices: invoices.filter((i) => i.issuedOn >= '2026-11-01' && i.status === 'sent') }
    render(<HomeBody data={d} />)
    const m = section('請求と入金の状況')
    expect(within(m).getAllByText('先月の記録がありません')).toHaveLength(3)
    expect(m.textContent).not.toContain('%')
  })
  it('[SCR-001:many] 件数は 3 けた（126件）、日数は 3 けた、数字は 8 けた、取引先名は最長の 60 字を省略せず全部見せる', () => {
    renderHome('many')
    const todo = section('今日やること')
    expect(within(todo).getByRole('link', { name: /未確認.*入金.*126件/ })).toBeInTheDocument()
    expect(within(todo).getByText(/623日超過/)).toBeInTheDocument()
    expect(within(section('請求と入金の状況')).getByText('15,071,100')).toBeInTheDocument()
    const rows = within(section('最近の動き')).getAllByRole('listitem')
    expect(rows).toHaveLength(ACTIVITY_LIMIT)
    expect(within(rows[0]).getByText(`${LONGEST_CLIENT_NAME}・INV-2026-9999`)).toBeInTheDocument()
    expect(LONGEST_CLIENT_NAME).toHaveLength(60)
  })
})

describe('[REQ-002] 状況の呼び名と札', () => {
  it('[SCR-001:default] 札は絵と言葉を持ち、呼び名は terms のとおり。調子は 期限超過・未確認＝確認待ち、下書き＝始まっていない', () => {
    renderHome()
    const todo = section('今日やること')
    for (const [word, tone] of [['期限超過', 'wait'], ['未確認', 'wait'], ['下書き', 'draft']] as const) {
      const tag = within(todo).getByText(word).closest('[data-tone]') as HTMLElement
      expect(tag).toHaveAttribute('data-tone', tone)
      expect(tag.querySelector('svg')).not.toBeNull()
    }
  })
  it('[SCR-001:default] 札は 3 枚（5 枚以下）なので、すべて通常の札（静かにしない）', () => {
    const { container } = renderHome()
    const tags = [...container.querySelectorAll('[data-cmp="CMP-003"]')]
    expect(tags).toHaveLength(3)
    expect(tags.map((t) => t.getAttribute('data-density'))).toEqual(['normal', 'normal', 'normal'])
  })
  it('[SCR-001:default] 避ける言い方（状態・送信・発行・キャンセル・顧客・ステータス）が画面に出ない', () => {
    for (const state of STATES) {
      const { container, unmount } = renderHome(state)
      expect(container.textContent ?? '').not.toMatch(/状態|送信|発行|キャンセル|顧客|ステータス|ダッシュボード|空状態/)
      unmount()
    }
  })
})

describe('[REQ-003] 金額と日付の表示', () => {
  it('[SCR-001:default] 金額は桁区切りと「円」、¥・全角数字を使わない。日付は「2026年11月13日」「10/31(土)」。負の符号は U+2212', () => {
    const { container } = renderHome()
    const text = container.textContent ?? ''
    expect(text).toMatch(/476,100円|476,100\s*円/)
    expect(text).toContain('2026年11月13日')
    expect(text).toContain('10/31(土)')
    expect(text).not.toMatch(/[¥￥０-９]/)
    expect(text).not.toMatch(/(?<![\d,])\d{4,}円/)
  })
  it('[SCR-001:default] 数字と日本語の間に空白を入れない（件・日・円は数字の直後）', () => {
    const { container } = renderHome()
    expect(container.textContent ?? '').not.toMatch(/\d [぀-ヿ一-鿿]|[぀-ヿ一-鿿] \d/)
  })
  it('[SCR-001:default] 数字と単位は途中で折らない（nowrap）', () => {
    const { container } = renderHome()
    expect([...container.querySelectorAll('[data-cmp="CMP-008"]')].every((e) => e.className.includes('whitespace-nowrap'))).toBe(true)
  })
})

describe('[REQ-007] アクセシビリティ（実ブラウザでの axe・44px は ui-audit。ここは構造とキーボード）', () => {
  it('[SCR-001:default] キーボードの Tab だけで、今日やることの行と最近の動きの行に届く。押せるものは a か button だけ', async () => {
    const { container } = renderHome()
    const names: string[] = []
    for (let i = 0; i < 30; i++) {
      await userEvent.tab()
      const el = document.activeElement as HTMLElement
      if (!el || el === document.body) break
      names.push(el.textContent ?? '')
      if (names.filter((n) => n === el.textContent).length > 1) break
    }
    expect(names.some((n) => /期限超過.*請求書.*3件/.test(n))).toBe(true)
    expect(names.some((n) => /入金を記録しました/.test(n))).toBe(true)
    expect(container.querySelectorAll('[onclick], div[tabindex], span[tabindex]')).toHaveLength(0)
  })
  it('[SCR-001:default] 行のリンクは高さ 44px 以上の指定（min-h-11）を持ち、区画は見出しで名前が付く', () => {
    renderHome()
    for (const name of ['今日やること', '請求と入金の状況', '最近の動き']) expect(section(name)).toHaveAccessibleName(name)
    for (const a of within(section('今日やること')).getAllByRole('link')) expect(a.className).toContain('min-h-11')
    for (const a of within(section('最近の動き')).getAllByRole('link')) expect(a.className).toContain('min-h-11')
  })
  it('[SCR-001:default] 札・件数の絵は読み上げに出さず、読み上げる名前は見える文字を含む', () => {
    const { container } = renderHome()
    expect([...container.querySelectorAll('svg')].every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(true)
    expect(screen.getByRole('link', { name: /期限超過/ })).toHaveTextContent('期限超過')
  })
})

describe('[REQ-008] 待ち・空・失敗の見せ方', () => {
  it('[SCR-001:loading] 区画の見出しは出したまま、中身は骨組み。「請求書はまだありません」は出さない。読み上げは 1 つだけ', () => {
    const { container } = renderHome('loading')
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['今日やること', '請求と入金の状況', '最近の動き'])
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('読み込んでいます')
    expect(container.querySelectorAll('[data-cmp="CMP-013"]').length).toBeGreaterThan(3)
    expect(container.textContent).not.toContain('請求書はまだありません')
    expect(screen.queryByRole('link', { name: /件/ })).not.toBeInTheDocument()
  })
  it('[SCR-001:error] 失敗は何が起きたかと直し方を本体の位置に（role=alert）、「もう一度読み込む」で待ちを経て立ち直る。0 件にしない', async () => {
    vi.useFakeTimers()
    renderHome('error')
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('今日やることと数字を表示できません')
    expect(alert).toHaveTextContent('もう一度読み込んでください')
    expect(alert.textContent).not.toMatch(/エラー|サーバー|申し訳/)
    expect(screen.queryByText('請求書はまだありません')).not.toBeInTheDocument()
    const retry = screen.getByRole('button', { name: 'もう一度読み込む' })
    act(() => { retry.click() })
    expect(screen.getByRole('button', { name: /読み込んでいます/ })).toHaveAttribute('aria-busy', 'true')
    act(() => { vi.advanceTimersByTime(700) })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(section('今日やること')).toBeInTheDocument()
  })
  it('[SCR-001:empty] 請求書が 1 件も無い初回は、理由と次の一手（主ボタンと、はじめての設定への入口）。数字の区画は出さない', () => {
    renderHome('empty')
    expect(screen.getByText('請求書はまだありません')).toBeInTheDocument()
    expect(screen.getByText(/請求書を作ると、今月の請求額や今日やること、最近の動きがここに並びます。/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'はじめての設定' })).toHaveAttribute('href', '?screen=setup')
    expect(screen.getAllByRole('link', { name: '請求書を作る' })).toHaveLength(1)
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    expect(screen.queryByText(/0件|0円/)).not.toBeInTheDocument()
  })
  it('[SCR-001:todo_empty] 今日やることが 0 件（片付いた）は結果を言い、請求書の一覧へ導く。作る導線は区画に出さない。数字と動きは残る', () => {
    renderHome('todo_empty')
    const todo = section('今日やること')
    expect(within(todo).getByText('今日やることはすべて済みました')).toBeInTheDocument()
    expect(within(todo).getByRole('link', { name: '請求書の一覧を見る' })).toHaveAttribute('href', '?screen=invoices')
    expect(within(todo).queryByRole('link', { name: '請求書を作る' })).not.toBeInTheDocument()
    expect(within(todo).queryAllByRole('listitem')).toHaveLength(0)
    expect(within(section('請求と入金の状況')).getByText('0')).toBeInTheDocument()
    expect(within(section('最近の動き')).getAllByRole('listitem')).toHaveLength(ACTIVITY_LIMIT)
  })
  it('[SCR-001:default] 6 つの状態は、それぞれ見た目（文字）が違う', () => {
    const seen = new Set<string>()
    for (const state of STATES) {
      const { container, unmount } = renderHome(state)
      seen.add(container.textContent ?? '')
      unmount()
    }
    expect(seen.size).toBe(STATES.length)
  })
})

describe('[REQ-027] URL と戻る', () => {
  it('[SCR-001:default] 行を押すと履歴に積んで移り、絞り込みは URL に持つ（?screen=invoices&status=overdue）', async () => {
    const before = window.history.length
    renderHome()
    await userEvent.click(screen.getByRole('link', { name: /期限超過.*請求書.*3件/ }))
    expect(window.location.search).toBe('?screen=invoices&status=overdue')
    expect(window.history.length).toBe(before + 1)
  })
  it('[SCR-001:default] 最近の動きの行は、請求書の id だけを URL に持つ（取引先名・金額などの個人情報を入れない）', () => {
    renderHome()
    const hrefs = within(section('最近の動き')).getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs[0]).toBe(`?screen=invoice-detail&id=${invoices.find((i) => i.number === 'INV-2026-0027')!.id}`)
    for (const h of hrefs) expect(h).toMatch(/^\?screen=invoice-detail&id=inv-\d+$/)
  })
  it('[SCR-001:default] 行き先は screens.yaml の to（請求書・請求書の作成・請求書の詳細・入金の確認・はじめての設定）だけ', () => {
    for (const state of ['default', 'empty', 'todo_empty']) {
      const { container, unmount } = renderHome(state)
      const dest = new Set([...container.querySelectorAll('main a[href]')].map((a) => new URLSearchParams(a.getAttribute('href') ?? '').get('screen')))
      for (const d of dest) expect(['invoices', 'invoice-new', 'invoice-detail', 'payments', 'setup']).toContain(d)
      unmount()
    }
  })
})

describe('[REQ-010] 配信：外部の読み込みが無い', () => {
  it('[SCR-001:default] 描いた DOM に外部の src・href・img・script・link が無い。index.html は lang=ja', () => {
    for (const state of STATES) {
      const { container, unmount } = renderHome(state)
      expect(container.querySelectorAll('img, script, link, iframe, video, audio')).toHaveLength(0)
      expect([...container.querySelectorAll('[src], [href]')].filter((e) => /^(https?:)?\/\//.test(e.getAttribute('src') ?? e.getAttribute('href') ?? ''))).toHaveLength(0)
      unmount()
    }
    expect(readFileSync(join(__dirname, '..', '..', '..', 'index.html'), 'utf8')).toMatch(/<html lang="ja"/)
  })
})

describe('[REQ-028] 構造の守り（この画面のソース）', () => {
  const files = readdirSync(__dirname).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f))
  const source = files.map((f) => ({ f, text: readFileSync(join(__dirname, f), 'utf8') }))
  it('[SCR-001:default] 取り込みは ui・parts・app・data の入口と、同じフォルダの部品だけ（別の画面を取り込まない）', () => {
    const bad = source.flatMap(({ f, text }) => [...text.matchAll(/from '(\.[^']*)'/g)].map((m) => m[1]).filter((s) => !/^\.\/[A-Za-z]+$/.test(s) && !/^\.\.\/\.\.\/(ui|parts|data)$/.test(s) && !/^\.\.\/\.\.\/app\/[A-Za-z]+$/.test(s)).map((s) => `${f}: ${s}`))
    expect(bad).toEqual([])
    expect(files.length).toBeGreaterThanOrEqual(9)
  })
  it('[SCR-001:default] 色・px・角丸・影・秒数・style 属性の直書きが無い。1 ファイル 1 部品', () => {
    const bad = source.flatMap(({ f, text }) => [
      ...[...text.matchAll(/[a-z@:-]+-\[[^\]\s]+\]|#[0-9a-fA-F]{3,8}\b|style=\{|!important|\b(?:duration|delay)-\d+/g)].map((m) => `${f}: ${m[0]}`),
      ...((text.match(/^export function [A-Z]/gm) ?? []).length > 1 ? [`${f}: 部品が 2 つ以上`] : []),
    ])
    expect(bad).toEqual([])
  })
  it('[SCR-001:default] 数の欠損を ?? 0・|| 0 で 0 にしない。Intl・¥ を使わない（整形は data の 1 か所）', () => {
    const bad = source.flatMap(({ f, text }) => [...text.matchAll(/(\?\?|\|\|)\s*0\b|\bIntl\.|toLocale|¥/g)].map((m) => `${f}: ${m[0]}`))
    expect(bad).toEqual([])
  })
  it('[SCR-001:default] 見た目の順を order・reverse で入れ替えない（DOM の順＝見た目の順）', () => {
    const bad = source.flatMap(({ f, text }) => [...text.matchAll(/(?:^|[^\w-])(?:[a-z0-9@]+:)*order-(?:first|last|none|-?\d+)\b|\bflex-(?:col|row)-reverse\b|\bcol-(?:start|end)-\d/g)].map((m) => `${f}: ${m[0]}`))
    expect(bad).toEqual([])
  })
  it('[SCR-001:default] 今日は固定の「いま」（data の TODAY）。画面は new Date() を読まない', () => {
    expect(TODAY).toBe('2026-11-13')
    expect(source.flatMap(({ f, text }) => (/new Date\(|Date\.now\(/.test(text) && f !== 'summary.ts' ? [f] : []))).toEqual([])
  })
})
