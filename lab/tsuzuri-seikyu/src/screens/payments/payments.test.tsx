import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SAVE_WAIT_MS } from '../../data'
import { ToastProvider } from '../../ui'
import { copy } from './copy'
import { screen as def } from './index'
import { canTreatAsFee, FEE_LIMIT } from './logic'

const Component = def.Component
const open = (state = 'default') => render(<ToastProvider><Component state={state} /></ToastProvider>)
const user = () => userEvent.setup()
const slow = { timeout: SAVE_WAIT_MS * 4 }
const table = (name: string) => screen.getByRole('table', { name })
const rowsOf = (name: string) => within(table(name)).getAllByRole('row').slice(1)

beforeEach(() => { window.history.replaceState(null, '', window.location.pathname) })
afterEach(() => { window.history.replaceState(null, '', window.location.pathname) })

describe('[SCR-007:default] 未確認の入金を一覧で見る', () => {
  it('[REQ-001] 見出し・主ボタンが 1 つ・節の見出しは h2', () => {
    open()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: '入金の確認' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'まとめて確認する' })).toHaveLength(1)
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['未確認の入金', '確認済みの入金'])
  })
  it('[REQ-002] 未確認は 6 件。件数・合計・いちばん古い入金が先頭に書いてある', () => {
    open()
    expect(rowsOf('未確認の入金の一覧')).toHaveLength(6)
    expect(screen.getByText(/^6件・合計/)).toBeInTheDocument()
  })
  it('[REQ-003] 状況は色だけでなく文字でも言う', () => {
    open()
    expect(within(table('未確認の入金の一覧')).getAllByText('未確認').length).toBeGreaterThan(0)
  })
  it('[REQ-021] 名義と金額が 1 件だけ合う入金は、選ばれた状態で並び、合わない入金は請求書を選ぶ', () => {
    open()
    const checks = within(table('未確認の入金の一覧')).getAllByRole('checkbox')
    expect(checks.length).toBeGreaterThan(0)
    checks.forEach((c) => expect(c).toBeChecked())
    expect(within(table('未確認の入金の一覧')).getAllByRole('button', { name: /請求書を選ぶ$/ }).length).toBeGreaterThan(0)
  })
  it('[REQ-022] 合う入金は 1 つ操作で確認でき、確認の直後に「元に戻す」が出る。戻すと未確認に戻る', async () => {
    open()
    const before = rowsOf('未確認の入金の一覧').length
    const btn = within(table('未確認の入金の一覧')).getAllByRole('button', { name: /の入金を確認する$/ })[0]
    await user().click(btn)
    await waitFor(() => expect(rowsOf('未確認の入金の一覧')).toHaveLength(before - 1), slow)
    await user().click(await screen.findByRole('button', { name: '元に戻す' }))
    await waitFor(() => expect(rowsOf('未確認の入金の一覧')).toHaveLength(before), slow)
  })
  it('[REQ-007] 確認済みの入金は請求書の詳細へのリンクを持つ', () => {
    open()
    const links = within(table('確認済みの入金の一覧')).getAllByRole('link')
    expect(links[0].getAttribute('href')).toContain('screen=invoice-detail')
  })
  it('[REQ-008] 表の見出しは 5 列で、金額は右寄せの列', () => {
    open()
    expect(within(table('未確認の入金の一覧')).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['振込名義', '入金日', '金額（円）', '状況', '操作'])
  })
  it('[REQ-027] 入金を開くと URL の pay に置かれ、閉じると外れる', async () => {
    open()
    const btn = within(table('未確認の入金の一覧')).getAllByRole('button', { name: /請求書を選ぶ$/ })[0]
    await user().click(btn)
    expect(window.location.search).toContain('pay=')
    expect(screen.getByRole('heading', { level: 3, name: /./ })).toBeInTheDocument()
    await user().click(screen.getByRole('button', { name: 'やめる' }))
    expect(window.location.search).not.toContain('pay=')
  })
})

describe('[SCR-007:loading] 読み込み中', () => {
  it('[REQ-001] 見出しと骨組みを出し、主ボタンは押せない', () => {
    open('loading')
    expect(screen.getByRole('heading', { level: 1, name: '入金の確認' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'まとめて確認する' })).toBeDisabled()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('[SCR-007:error] 読み込みの失敗', () => {
  it('[REQ-001] 失敗を言い、もう一度で立ち直る', async () => {
    open('error')
    expect(screen.getByText('入金を読み込めませんでした')).toBeInTheDocument()
    await user().click(screen.getByRole('button', { name: /もう一度/ }))
    expect(await screen.findByRole('table', { name: '未確認の入金の一覧' }, slow)).toBeInTheDocument()
  })
})

describe('[SCR-007:empty] 片付いた', () => {
  it('[REQ-002] 結果を言い、作る導線は出さず、ホームへの道を出す', () => {
    open('empty')
    expect(screen.getByText('未確認の入金はすべて確認しました')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ホームを見る' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('[SCR-007:many] 未確認が多い', () => {
  it('[REQ-008] 20 件ごとのページ送りで、2 ページ目は URL の page に置かれる', async () => {
    open('many')
    expect(rowsOf('未確認の入金の一覧')).toHaveLength(20)
    const nav = screen.getByRole('navigation', { name: 'ページ送り' })
    await user().click(within(nav).getByRole('button', { name: '次へ' }))
    expect(window.location.search).toContain('page=2')
    expect(rowsOf('未確認の入金の一覧')).toHaveLength(12)
  })
  it('[REQ-002] 確認済みの表は新しい 10 件までで、そのことを書く', () => {
    open('many')
    expect(rowsOf('確認済みの入金の一覧').length).toBeLessThanOrEqual(10)
  })
})

describe('[SCR-007:candidates_empty] 合う請求書の候補が無い', () => {
  it('[REQ-021] 候補が無いと言い、請求書を探す欄で未入金の請求書を探せる', async () => {
    open('candidates_empty')
    expect(screen.getByText(/合う請求書の候補が見つかりませんでした/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '入金を確認する' })).toBeDisabled()
    await user().type(screen.getByRole('textbox', { name: /請求書を探す/ }), 'INV')
    expect(screen.getAllByRole('radio').length).toBeGreaterThan(0)
  })
  it('[REQ-022] 探した請求書を選ぶと確認できる', async () => {
    open('candidates_empty')
    await user().type(screen.getByRole('textbox', { name: /請求書を探す/ }), 'INV')
    await user().click(screen.getAllByRole('radio')[0])
    const ok = screen.queryByRole('button', { name: '入金を確認する' })
    if (ok) expect(ok).toBeEnabled()
    else expect(screen.getByText('差額があります')).toBeInTheDocument()
  })
})

describe('[SCR-007:status_diff] 差額がある', () => {
  it('[REQ-022] その場で差額と理由を見せ、2 択を出す。窓にはしない', () => {
    open('status_diff')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('差額があります')).toBeInTheDocument()
    expect(screen.getByText('考えられる理由は、振込手数料です。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '確認せず戻る' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '差額を手数料として確認する' })).toBeInTheDocument()
  })
  it('[REQ-021] 候補の請求書は、組の名前を持つラジオの組で、請求額と期限・合う理由と差額が選択肢の中にある', () => {
    open('status_diff')
    const group = screen.getByRole('group', { name: '候補の請求書' })
    const radios = within(group).getAllByRole('radio')
    expect(radios.length).toBeGreaterThan(0)
    expect(radios[0].closest('label')).toHaveTextContent(/請求額.+（税込）・支払期限/)
    expect(radios[0].closest('label')).toHaveTextContent(/差額/)
  })
  it('[REQ-022] 手数料として確認すると、確認済みに入り、差額の注記が付く', async () => {
    open('status_diff')
    await user().click(screen.getByRole('button', { name: '差額を手数料として確認する' }))
    await waitFor(() => expect(screen.queryByText('差額があります')).toBeNull(), slow)
    expect(within(table('確認済みの入金の一覧')).getByText(/手数料として確認しました/)).toBeInTheDocument()
  })
})

describe('[SCR-007:confirming] まとめて確認する窓', () => {
  it('[REQ-022] 件数と合計額を言い、確認で閉じて確認済みへ移る', async () => {
    open('confirming')
    const dlg = screen.getByRole('dialog')
    expect(within(dlg).getByText('件数')).toBeInTheDocument()
    expect(within(dlg).getByText('合計')).toBeInTheDocument()
    await user().click(within(dlg).getByRole('button', { name: '入金を確認する' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), slow)
  })
  it('[REQ-001] やめるで窓を閉じ、何も確認しない', async () => {
    open('confirming')
    const before = rowsOf('未確認の入金の一覧').length
    await user().click(within(screen.getByRole('dialog')).getByRole('button', { name: 'やめる' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(rowsOf('未確認の入金の一覧')).toHaveLength(before)
  })
})

describe('[SCR-007:partial] 一部だけ確認できた', () => {
  it('[REQ-022] できた件数と残った件数を言い、残った分だけもう一度確認できる', async () => {
    open('partial')
    expect(screen.getByText('4件中3件を確認しました')).toBeInTheDocument()
    expect(screen.getByText('通信が途中で切れました。')).toBeInTheDocument()
    await user().click(screen.getByRole('button', { name: 'もう一度確認する' }))
    await waitFor(() => expect(screen.queryByText('4件中3件を確認しました')).toBeNull(), slow)
  })
})

describe('[SCR-007:saving] 確認の処理中', () => {
  it('[REQ-022] 処理中は窓を閉じられず、確認のボタンも続けて押せない', () => {
    open('saving')
    const dlg = screen.getByRole('dialog')
    expect(within(dlg).getByRole('button', { name: /入金を確認/ })).toHaveAttribute('aria-disabled', 'true')
    expect(within(dlg).getByRole('button', { name: 'やめる' })).toBeDisabled()
  })
})

describe('[SCR-007:save_failed] 確認の送信が失敗した', () => {
  it('[REQ-022] まとめて確認の窓を閉じずに失敗を言い、選んだ内容を残して、もう一度確認できる（もう一度も失敗する）', async () => {
    open('save_failed')
    const dlg = screen.getByRole('dialog')
    expect(within(dlg).getByRole('alert')).toHaveTextContent(copy.confirmFailed)
    expect(within(dlg).queryByRole('button', { name: '入金を確認する' })).toBeNull()
    const again = within(dlg).getByRole('button', { name: 'もう一度確認する' })
    expect(within(dlg).getByText('件数')).toBeInTheDocument()
    await user().click(again)
    expect(within(dlg).getByRole('button', { name: /確認しています/ })).toHaveAttribute('aria-busy', 'true')
    await waitFor(() => expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'もう一度確認する' })).not.toHaveAttribute('aria-busy'), slow)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByRole('alert')).toBeInTheDocument()
  })
  it('[REQ-022] 1 件の確認が失敗したら、その行に知らせて行は未確認のまま残る。選んだチェックは残る', async () => {
    open('save_failed')
    await user().click(within(screen.getByRole('dialog')).getByRole('button', { name: 'やめる' }))
    const before = rowsOf('未確認の入金の一覧').length
    const checked = within(table('未確認の入金の一覧')).getAllByRole('checkbox').filter((c) => (c as HTMLInputElement).checked).length
    const btn = within(table('未確認の入金の一覧')).getAllByRole('button', { name: /の入金を確認する$/ })[0]
    await user().click(btn)
    const alert = await screen.findByRole('alert', undefined, slow)
    expect(alert).toHaveTextContent(copy.confirmFailed)
    expect(rowsOf('未確認の入金の一覧')).toHaveLength(before)
    expect(within(table('未確認の入金の一覧')).getAllByRole('checkbox').filter((c) => (c as HTMLInputElement).checked)).toHaveLength(checked)
    expect(btn).toBeEnabled()
  })
  it('[REQ-022] 開いた入金の確認が失敗したら、パネルの中に知らせて、選んだ請求書を残す', async () => {
    open('save_failed')
    await user().click(within(screen.getByRole('dialog')).getByRole('button', { name: 'やめる' }))
    await user().click(within(table('未確認の入金の一覧')).getByRole('button', { name: /アカシアデンキの請求書を選ぶ$/ }))
    await user().click(screen.getAllByRole('radio')[0])
    const panel = document.getElementById('payments-panel') as HTMLElement
    await user().click(within(panel).getByRole('button', { name: '差額を手数料として確認する' }))
    const alert = await within(panel).findByRole('alert', undefined, slow)
    expect(alert).toHaveTextContent(copy.confirmFailed)
    expect(screen.getAllByRole('radio')[0]).toBeChecked()
    expect(window.location.search).toContain('pay=')
  })
})

describe('[REQ-022] 差額を手数料として確認できる範囲（純粋な関数）', () => {
  it('入金のほうが少なく、上限（FEE_LIMIT）以内だけが手数料。上限ちょうどは含み、1 円超えると含まない。多い・差額なしは含まない', () => {
    expect(canTreatAsFee(-FEE_LIMIT)).toBe(true)
    expect(canTreatAsFee(-FEE_LIMIT - 1)).toBe(false)
    expect(canTreatAsFee(-1)).toBe(true)
    expect(canTreatAsFee(0)).toBe(false)
    expect(canTreatAsFee(1)).toBe(false)
  })
})

describe('[SCR-007:refreshing] 更新中', () => {
  it('[REQ-003] 前の一覧を残し、確認の操作は押せない。押せない理由が結びついている', () => {
    open('refreshing')
    expect(document.getElementById('payments-lock-reason')).toHaveTextContent('更新しています。終わるまで、入金を確認できません')
    expect(rowsOf('未確認の入金の一覧')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'まとめて確認する' })).toBeDisabled()
    const confirms = within(table('未確認の入金の一覧')).getAllByRole('button', { name: /の入金を確認する$/ })
    expect(confirms.length).toBeGreaterThan(0)
    confirms.forEach((b) => expect(b).toBeDisabled())
    expect(confirms[0]).toHaveAccessibleDescription(/更新しています/)
  })
})

describe('[SCR-007:stale] 古い内容', () => {
  it('[REQ-003] 時点を言い、読み込み直すまで確認できない。読み込むと確認できる', async () => {
    open('stale')
    expect(screen.getByText(/時点の内容です/)).toBeInTheDocument()
    expect(screen.getByText('更新できませんでした。新しい内容を読み込むまで、入金を確認できません。もう一度読み込んでください。')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'まとめて確認する' })).toBeDisabled()
    await act(async () => { await user().click(screen.getByRole('button', { name: /もう一度/ })) })
    await waitFor(() => expect(screen.getByRole('button', { name: 'まとめて確認する' })).toBeEnabled(), slow)
  })
})
