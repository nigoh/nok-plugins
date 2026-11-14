import { act, cleanup, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRoute } from '../../app/nav'
import { ToastProvider } from '../../ui'
import { clearDraft, loadDraft, saveDraft } from './draft'
import { blankSetupValues, roundingOptions, rulesDefaults, specsOfStep, STEP_NAMES, type TextKey } from './model'
import { fakeSave } from '../../data'
import { screen as setup } from './index'

vi.mock('../../data/fakeSave', async (orig) => {
  const m = await orig<typeof import('../../data/fakeSave')>()
  return { ...m, fakeSave: vi.fn(m.fakeSave) }
})
const slow = { timeout: 3000 }

/** Root と同じ：URL の ?state= を画面に渡す。段の移動（URL が替わる）をそのまま確かめられる。 */
function App() {
  const route = useRoute()
  const state = route.state && setup.states.includes(route.state) ? route.state : 'default'
  return <ToastProvider><setup.Component state={state} /></ToastProvider>
}
function open(state?: string) {
  window.history.replaceState(null, '', state ? `?screen=setup&state=${state}` : '?screen=setup')
  return render(<App />)
}
const search = () => new URLSearchParams(window.location.search)
const box = (name: string | RegExp) => screen.getByRole('textbox', { name })
const primary = () => document.querySelector<HTMLElement>('[data-variant="primary"]') as HTMLElement
const stepper = () => screen.getByRole('navigation', { name: 'はじめての設定の進み具合' })

/** 欄ごとの入力例（欄の表に欄を足すと、ここで型が通らなくなって気づく）。 */
const sample: Record<TextKey, string> = {
  companyName: '株式会社テスト', zip: '060-0042', address: '北海道札幌市中央区大通西5丁目', phone: '011-555-0199', email: 'info@test.example.jp', registrationNo: 'T1234567890123',
  prefix: 'INV-', bank: '北洋信用金庫 中央支店', clientName: '株式会社テスト商事', clientEmail: 'keiri@test-shoji.example.jp', contact: '佐藤',
}
/** 1 段目の必須の欄（欄の表から数える）。 */
const required1 = specsOfStep(1).filter((s) => s.required)
const optional1 = specsOfStep(1).length - required1.length
/** 1 段目の任意の欄の 1 つ（空のまま進んでも誤りにならない欄の見本）。 */
const optionalSpec = specsOfStep(1).find((s) => !s.required) as ReturnType<typeof specsOfStep>[number]
const optionalBox = () => box(new RegExp(`^${optionalSpec.label}`))
/** 1 段目の必須の欄をすべて入れる。 */
async function fillCompany(user: ReturnType<typeof userEvent.setup>) {
  for (const s of required1) await user.type(box(new RegExp(`^${s.label}`)), sample[s.key])
}

beforeEach(() => {
  clearDraft()
  vi.mocked(fakeSave).mockClear()
})

describe('[SCR-010:default] 1 段目', () => {
  it('[REQ-001][SCR-010:default] 題・戻り・主ボタン 1 つ・説明が骨格のとおり出る。メニューに現在地は無い', () => {
    open()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'はじめての設定' })).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'ホーム' })).toHaveAttribute('href', '?screen=home')
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
    expect(primary()).toHaveTextContent('次へ進む')
    expect(screen.getByText('入力は段ごとに保存されます。')).toBeInTheDocument()
    expect(document.querySelector('[aria-current="page"]')).toBeNull()
  })
  it('[REQ-026][SCR-010:default] 現在地と全体数が出る。1 段目は「やめる」で、押すとホームへ', () => {
    open()
    expect(within(stepper()).getAllByRole('listitem')).toHaveLength(3)
    expect(within(stepper()).getByText('（いま。全3段のうち1段目）')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '自社の情報' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'やめる' })).toHaveAttribute('href', '?screen=home')
  })
  it('[REQ-009][SCR-010:default] 任意の欄にだけ「任意」が付き（必須には印なし）、補足が欄に結び付く', () => {
    open()
    expect(screen.getAllByText('任意')).toHaveLength(optional1)
    expect(screen.queryByText('必須')).toBeNull()
    expect(box(/^郵便番号/)).toHaveAccessibleDescription('例：060-0042')
    expect(box(/^会社名/)).toHaveAttribute('autocomplete', 'organization')
    expect(box(/^郵便番号/)).toHaveAttribute('inputmode', 'numeric')
  })
  it('[REQ-009][SCR-010:default] 空で進むと誤りが出て、最初の誤り欄へ移る。入力は消えず、段も替わらない', async () => {
    const user = userEvent.setup()
    open()
    await user.type(optionalBox(), sample[optionalSpec.key])
    await user.click(primary())
    expect(screen.getByText(`${required1.length}か所を直してください`)).toBeInTheDocument()
    expect(box(/^会社名/)).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(box(/^会社名/)).toHaveFocus())
    expect(optionalBox()).toHaveValue(sample[optionalSpec.key])
    expect(search().get('state')).toBeNull()
  })
  it('[REQ-009][SCR-010:default] 形式の誤りは欄を離れた時に欄の直下へ。入力中は出さず、直すと消える', async () => {
    const user = userEvent.setup()
    open()
    await user.type(box(/^郵便番号/), '12345')
    expect(screen.queryByText('郵便番号は7桁の数字で入力してください。')).toBeNull()
    await user.tab()
    expect(screen.getByText('郵便番号は7桁の数字で入力してください。')).toBeInTheDocument()
    await user.type(box(/^郵便番号/), '67')
    expect(screen.queryByText('郵便番号は7桁の数字で入力してください。')).toBeNull()
  })
  it('[REQ-009][SCR-010:default] 全角の数字とハイフンは受け、離れた時に半角へ直して知らせる', async () => {
    const user = userEvent.setup()
    open()
    await user.type(box(/^郵便番号/), '０６０－００４２')
    await user.tab()
    expect(box(/^郵便番号/)).toHaveValue('060-0042')
    expect(box(/^郵便番号/)).toHaveAccessibleDescription('例：060-0042 半角にそろえました')
  })
  it('[REQ-009][SCR-010:default] 前後の空白を除いただけでは「半角にそろえました」と言わない（wasWidened）。値は空白なしに直る', async () => {
    const user = userEvent.setup()
    open()
    await user.type(box(/^電話/), ' 011-555-0199 ')
    await user.tab()
    expect(box(/^電話/)).toHaveValue('011-555-0199')
    expect(box(/^電話/)).toHaveAccessibleDescription('例：011-555-0199')
    expect(screen.queryByRole('status')).toBeNull()
  })
  it('[REQ-009][SCR-010:default] 変換を確定する Enter では送らない', () => {
    open()
    const input = box(/^会社名/)
    const composing = createEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent(input, composing)
    expect(composing.defaultPrevented).toBe(true)
    const plain = createEvent.keyDown(input, { key: 'Enter' })
    fireEvent(input, plain)
    expect(plain.defaultPrevented).toBe(false)
  })
  it('[REQ-007][SCR-010:default] 見た目の順と DOM の順が同じ：欄 → やめる → 主ボタン。欄は名前で見つかる', () => {
    open()
    const after = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(after(box(/^メール/), screen.getByRole('link', { name: 'やめる' }))).toBe(true)
    expect(after(screen.getByRole('link', { name: 'やめる' }), primary())).toBe(true)
    for (const t of screen.getAllByRole('textbox')) expect(t).toHaveAccessibleName()
  })
})

describe('[SCR-010:step_2][SCR-010:step_3] 段を進める・戻る', () => {
  it('[REQ-026][SCR-010:default] 必須を入れて進むと 2 段目へ。入力が保存され、見出しへフォーカスが移り、履歴に積まれる', async () => {
    const user = userEvent.setup()
    open()
    await fillCompany(user)
    const before = window.history.length
    await user.click(primary())
    expect(search().get('state')).toBe('step_2')
    expect(window.history.length).toBe(before + 1)
    expect(screen.getByRole('heading', { level: 2, name: STEP_NAMES[1] })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: STEP_NAMES[1] })).toHaveFocus())
    expect(within(stepper()).getByText('（いま。全3段のうち2段目）')).toBeInTheDocument()
    expect(loadDraft()?.reached).toBe(2)
    expect(loadDraft()?.values.companyName).toBe('株式会社テスト')
    // 個人情報は URL に入れない（REQ-027）
    expect(decodeURIComponent(window.location.href)).not.toContain('株式会社テスト')
  })
  it('[REQ-026][SCR-010:step_2] 2 段目：初期値が入り、印は付かず「すべて入力してください。」。空の振込先は誤りになる（1 件なので一覧は出ない）', async () => {
    const user = userEvent.setup()
    open('step_2')
    expect(screen.getByText('すべて入力してください。')).toBeInTheDocument()
    expect(screen.queryByText('必須')).toBeNull()
    expect(screen.queryByText('任意')).toBeNull()
    expect(box(/^番号の頭/)).toHaveValue(rulesDefaults.prefix)
    expect(screen.getByRole('radio', { name: roundingOptions.find((o) => o.value === rulesDefaults.rounding)?.label })).toBeChecked()
    expect(screen.getByRole('radio', { name: '10%' })).toBeChecked()
    expect(screen.getByRole('combobox', { name: '支払条件' })).toHaveDisplayValue('月末締め・翌月末払い')
    expect(screen.getByRole('button', { name: '前の段へ戻る' })).toBeInTheDocument()
    await user.click(primary())
    expect(screen.getByText('振込先を入れてください。')).toBeInTheDocument()
    expect(screen.queryByText(/か所を直してください/)).toBeNull()
    await waitFor(() => expect(box(/^振込先/)).toHaveFocus())
    await user.type(box(/^振込先/), '北洋信用金庫 中央支店')
    await user.click(screen.getByRole('radio', { name: '四捨五入' }))
    await user.click(primary())
    expect(search().get('state')).toBe('step_3')
    expect(loadDraft()?.values.rounding).toBe('round')
  })
  it('[REQ-026][SCR-010:step_3] 3 段目：任意は 1 つ、主ボタンは「設定を終える」。戻ると 2 段目の入力が残っている', async () => {
    const user = userEvent.setup()
    open('step_2')
    await user.type(box(/^振込先/), '北洋信用金庫')
    await user.click(primary())
    expect(screen.getAllByText('任意')).toHaveLength(1)
    expect(primary()).toHaveTextContent('設定を終える')
    expect(box(/^取引先名/)).not.toHaveAttribute('autocomplete')
    expect(box(/^メール/)).not.toHaveAttribute('autocomplete')
    await user.click(screen.getByRole('button', { name: '前の段へ戻る' }))
    expect(search().get('state')).toBe('step_2')
    expect(box(/^振込先/)).toHaveValue('北洋信用金庫')
  })
  it('[REQ-027][SCR-010:step_2] ブラウザの戻るで 1 つ前の段へ戻り、入力は残る', async () => {
    const user = userEvent.setup()
    open()
    await fillCompany(user)
    await user.click(primary())
    expect(search().get('state')).toBe('step_2')
    await act(async () => { window.history.back(); await new Promise((r) => setTimeout(r, 50)) })
    expect(search().get('state')).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: '自社の情報' })).toBeInTheDocument()
    expect(box(/^会社名/)).toHaveValue('株式会社テスト')
  })
})

describe('[SCR-010:invalid] 入力の誤り', () => {
  it('[REQ-009][SCR-010:invalid] 必須が空の 1 段目：先頭に一覧、欄の直下にも同じ文。欄は invalid', () => {
    open('invalid')
    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(`${required1.length}か所を直してください`)).toBeInTheDocument()
    for (const s of required1) expect(screen.getAllByText(s.empty as string)).toHaveLength(2)
    expect(box(/^会社名/)).toHaveAttribute('aria-invalid', 'true')
    expect(optionalBox()).not.toHaveAttribute('aria-invalid')
  })
  it('[REQ-007][SCR-010:invalid] 軸の違反が無い（ラベル・説明・役割。色の比は実ブラウザで測る）', async () => {
    const { container } = open('invalid')
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
    expect(result.violations.map((v) => v.id)).toEqual([])
  })
})

describe('[SCR-010:saving] 最後の保存', () => {
  it('[REQ-009][SCR-010:saving] 保存中：押した主ボタンだけ処理中。欄は入力を残したまま変更できない', () => {
    open('saving')
    expect(primary()).toHaveAttribute('aria-busy', 'true')
    expect(primary()).toHaveTextContent('保存しています')
    expect(box(/^取引先名/)).toBeDisabled()
    expect(box(/^取引先名/)).toHaveValue('株式会社北斗印刷')
    expect(document.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
  })
  it('[REQ-009][REQ-026][SCR-010:step_3] 設定を終えると、二重に送らず、保存して知らせ、ホームへ移る。入力の控えは消える', async () => {
    const user = userEvent.setup()
    let done: () => void = () => {}
    vi.mocked(fakeSave).mockReturnValueOnce(new Promise((resolve) => { done = () => resolve({ ok: true, value: blankSetupValues() }) }) as never)
    open('step_3')
    await user.type(box(/^取引先名/), '株式会社テスト商事')
    await user.type(box(/^メール/), 'keiri@test-shoji.example.jp')
    saveDraft({ values: { ...blankSetupValues(), clientName: 'x' }, reached: 3 })
    await user.dblClick(primary())
    expect(fakeSave).toHaveBeenCalledTimes(1)
    expect(vi.mocked(fakeSave).mock.calls[0][0]).toMatchObject({ clientName: '株式会社テスト商事' })
    expect(vi.mocked(fakeSave).mock.calls[0][1]).toEqual({ outcome: 'ok' })
    expect(primary()).toHaveAttribute('aria-busy', 'true')
    await act(async () => { done() })
    expect(await screen.findByText('設定を保存しました')).toBeInTheDocument()
    expect(search().get('screen')).toBe('home')
    expect(loadDraft()).toBeNull()
  })
  it('[REQ-009][SCR-010:step_3] 保存に失敗しても入力は残り、元の画面でもう一度保存できる', async () => {
    const user = userEvent.setup()
    vi.mocked(fakeSave).mockResolvedValueOnce({ ok: false, reason: 'failed' })
    open('step_3')
    await user.type(box(/^取引先名/), '株式会社テスト商事')
    await user.type(box(/^メール/), 'keiri@test-shoji.example.jp')
    await user.click(primary())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('保存できませんでした。入力は残っています。もう一度保存してください。')
    expect(box(/^取引先名/)).toHaveValue('株式会社テスト商事')
    expect(box(/^取引先名/)).toBeEnabled()
    expect(primary()).not.toHaveAttribute('aria-busy')
    await user.click(primary())
    await waitFor(() => expect(search().get('screen')).toBe('home'), slow)
    expect(fakeSave).toHaveBeenCalledTimes(2)
  })
  it('[REQ-026][SCR-010:step_3] 「あとで登録する」は取引先の欄を検査せず、取引先なしで保存する', async () => {
    const user = userEvent.setup()
    open('step_3')
    await user.click(screen.getByRole('button', { name: 'あとで登録する' }))
    expect(screen.queryByText('取引先名を入れてください。')).toBeNull()
    await waitFor(() => expect(search().get('screen')).toBe('home'), slow)
    expect(vi.mocked(fakeSave).mock.calls[0][0]).toMatchObject({ clientName: '', clientEmail: '', contact: '' })
  })
})

describe('[SCR-010:save_failed] 最後の保存の失敗', () => {
  it('[REQ-009][SCR-010:save_failed] 3 段目の入力を残したまま、押した主ボタンの近くに直し方つきで知らせる。押し直しても失敗し、入力は消えない', async () => {
    const user = userEvent.setup()
    open('save_failed')
    expect(screen.getByRole('alert')).toHaveTextContent('保存できませんでした。入力は残っています。もう一度保存してください。')
    expect(box(/^取引先名/)).toHaveValue('株式会社北斗印刷')
    expect(box(/^取引先名/)).toBeEnabled()
    expect(primary()).toHaveTextContent('設定を終える')
    expect(primary()).not.toHaveAttribute('aria-busy')
    await user.click(primary())
    expect(primary()).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByRole('alert', {}, slow)).toHaveTextContent('保存できませんでした。')
    expect(vi.mocked(fakeSave).mock.calls[0][1]).toEqual({ outcome: 'failed' })
    expect(search().get('state')).toBe('save_failed')
    expect(box(/^取引先名/)).toHaveValue('株式会社北斗印刷')
  })
  it('[REQ-007][SCR-010:save_failed] 軸の違反が無い', async () => {
    const { container } = open('save_failed')
    const result = await axe.run(container, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
    expect(result.violations.map((v) => v.id)).toEqual([])
  })
})

describe('[SCR-010:resumed] 続きから', () => {
  const saved = () => saveDraft({ values: { ...blankSetupValues(), companyName: '株式会社つづき', zip: '060-0042', address: '北海道札幌市', email: 'a@b.example.jp' }, reached: 2 })
  it('[REQ-026][SCR-010:resumed] 先頭に「前回の続きです。2段目から始めます」と最初からやり直す操作。保存した 1 段目へ戻ると入力が残っている', async () => {
    const user = userEvent.setup()
    saved()
    open('resumed')
    const notice = screen.getByRole('status', { name: '' })
    expect(notice).toHaveTextContent('前回の続きです。2段目から始めます')
    expect(within(notice).getByRole('button', { name: '最初からやり直す' })).toBeInTheDocument()
    expect(within(stepper()).getByText('（いま。全3段のうち2段目）')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '前の段へ戻る' }))
    expect(box(/^会社名/)).toHaveValue('株式会社つづき')
    expect(screen.queryByText(/前回の続きです/)).toBeNull()
  })
  it('[REQ-026][SCR-010:resumed] 最初からやり直すと 1 段目の空から。直後に「元に戻す」で続きへ戻れる', async () => {
    const user = userEvent.setup()
    saved()
    open('resumed')
    await user.click(screen.getByRole('button', { name: '最初からやり直す' }))
    expect(search().get('state')).toBeNull()
    expect(box(/^会社名/)).toHaveValue('')
    expect(loadDraft()).toBeNull()
    expect(await screen.findByText('入力を消しました')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '元に戻す' }))
    expect(search().get('state')).toBe('resumed')
    expect(loadDraft()?.values.companyName).toBe('株式会社つづき')
    expect(screen.getByText('前回の続きです。2段目から始めます')).toBeInTheDocument()
  })
  it('[REQ-026][SCR-010:default] 途中でやめても、開き直すと入力が残っている', async () => {
    const user = userEvent.setup()
    open()
    await user.type(box(/^会社名/), '株式会社つづき')
    cleanup()
    open()
    expect(box(/^会社名/)).toHaveValue('株式会社つづき')
  })
})

describe('[SCR-010:loading][SCR-010:error][SCR-010:done] 待ち・失敗・終わり', () => {
  it('[REQ-026][SCR-010:loading] 読み込み中：骨組みと読み上げ。欄・手順の表示は出さず、主ボタンは押せない', () => {
    open('loading')
    expect(screen.getByRole('status')).toHaveTextContent('保存した入力を読み込んでいます')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('navigation', { name: /進み具合/ })).toBeNull()
    expect(primary()).toBeDisabled()
    expect(screen.getByRole('heading', { level: 1, name: 'はじめての設定' })).toBeInTheDocument()
  })
  it('[REQ-026][SCR-010:error] 読み込みの失敗：何が起きたかと直し方。もう一度で立ち直る', async () => {
    const user = userEvent.setup()
    open('error')
    expect(screen.getByRole('alert')).toHaveTextContent('保存した入力を読み込めませんでした')
    expect(screen.getByRole('alert')).toHaveTextContent('もう一度読み込んでください。')
    await user.click(screen.getByRole('button', { name: 'もう一度読み込む' }))
    expect(await screen.findByRole('textbox', { name: /^会社名/ }, { timeout: 3000 })).toBeInTheDocument()
    expect(within(stepper()).getByText('（いま。全3段のうち1段目）')).toBeInTheDocument()
  })
  it('[REQ-001][SCR-010:done] 終わったあとに開いたとき：終わったことと、ホームを開く・取引先の登録への道。欄は出さない', () => {
    open('done')
    expect(screen.getByRole('heading', { level: 2, name: '設定が終わりました' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ホームを開く' })).toHaveAttribute('href', '?screen=home')
    expect(screen.getByRole('link', { name: '取引先の登録' })).toHaveAttribute('href', '?screen=client-form')
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(document.querySelectorAll('[data-variant="primary"]')).toHaveLength(1)
  })
})
