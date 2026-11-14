import { describe, expect, it } from 'vitest'
import { clients, invoices, NOW, payments, TODAY, type Invoice } from '../../data'
import { homeSample, LONGEST_CLIENT_NAME } from './sampleVariants'
import { ACTIVITY_LIMIT, describeChange, metricsOf, outstandingOn, overdueOn, recentEvents, sameDayLastMonth, todoOf, todoTotal } from './summary'

const sample = { clients, invoices, payments }
const cmp = (yen: 'yen' | 'count', span: 'until' | 'at') => ({ unit: yen, span, compareDate: '2026-10-13' }) as const

describe('[REQ-012] 先月の同じ日', () => {
  it.each([
    ['2026-11-13', '2026-10-13'],
    ['2026-03-31', '2026-02-28'],
    ['2024-03-31', '2024-02-29'],
    ['2026-01-15', '2025-12-15'],
    ['2026-12-01', '2026-11-01'],
  ])('%s の先月の同じ日は %s（無い日は先月の最終日）', (today, want) => {
    expect(sameDayLastMonth(today)).toBe(want)
  })
})

describe('[REQ-012] 数字は 1 つの集計から出る（GP-7）', () => {
  it('[SCR-001:default] 今月の請求額・未入金の額・期限超過の件数を、先月の同じ日と並べて出す', () => {
    const m = metricsOf(invoices, TODAY)
    expect(m.compareDate).toBe('2026-10-13')
    expect(m.billed).toEqual({ now: 476100, before: 468600 })
    expect(m.unpaid).toEqual({ now: 1457500, before: 912800, count: 9 })
    expect(m.overdue).toEqual({ now: 3, before: 0 })
  })
  it('今日の未入金は送付済み（入金前・取り消し前）と同じ、期限超過は「今日やること」の件数と同じ関数から出る', () => {
    const sent = invoices.filter((i) => i.status === 'sent')
    expect(outstandingOn(invoices, TODAY).map((i) => i.id).sort()).toEqual(sent.map((i) => i.id).sort())
    expect(todoOf(sample, TODAY).overdue.count).toBe(metricsOf(invoices, TODAY).overdue.now)
    expect(overdueOn(invoices, TODAY).every((i) => i.dueOn < TODAY)).toBe(true)
  })
  it('下書きは請求額にも未入金にも入らない。取り消した請求書は、取り消した日より前の時点では未入金に入る', () => {
    const draft: Invoice = { ...invoices[0], id: 'd', status: 'draft', number: null, paidOn: null, issuedOn: '2026-11-10', history: [] }
    expect(metricsOf([...invoices, draft], TODAY).billed.now).toBe(476100)
    const voided = invoices.find((i) => i.status === 'void')!
    const voidedDay = voided.history.find((h) => h.kind === 'voided')!.at.slice(0, 10)
    expect(outstandingOn([voided], voidedDay)).toHaveLength(0)
    expect(outstandingOn([voided], '2026-10-24')).toHaveLength(0) // まだ請求日（10/25）より前
  })
})

describe('[REQ-012] 比べる相手の言い方（G-03）', () => {
  it('流れの量は「まで」、残高は「の時点」でなく日付そのもの。差は符号つき・率は 0 けた', () => {
    expect(describeChange({ now: 476100, before: 468600 }, cmp('yen', 'until'))).toEqual({ lead: '先月の13日までと比べて', change: '+7,500円（+2%）' })
    expect(describeChange({ now: 1457500, before: 912800 }, cmp('yen', 'at'))).toEqual({ lead: '先月の13日と比べて', change: '+544,700円（+60%）' })
  })
  it('[REQ-003] 減ったときの符号は「−」（U+2212）、0 の差は符号なし', () => {
    expect(describeChange({ now: 100, before: 200 }, cmp('yen', 'at')).change).toBe('−100円（−50%）')
    expect(describeChange({ now: 200, before: 200 }, cmp('count', 'at')).change).toBe('0件（0%）')
  })
  it('[REQ-003] 先月の記録が無ければ % を出さず「記録がありません」、先月が 0 なら % を出さず 0 と言う（0 と別）', () => {
    expect(describeChange({ now: 5, before: null }, cmp('yen', 'until'))).toEqual({ lead: '先月の記録がありません', change: null })
    expect(describeChange({ now: 3, before: 0 }, cmp('count', 'at'))).toEqual({ lead: '先月の13日は0件でした', change: null })
    expect(describeChange({ now: 3, before: 0 }, cmp('yen', 'until')).lead).toBe('先月の13日までは0円でした')
  })
  it('先月の記録が 1 件も無い請求書の束では、比べる相手が null になる', () => {
    const onlyThisMonth = invoices.filter((i) => i.issuedOn >= '2026-11-01')
    const m = metricsOf(onlyThisMonth, TODAY)
    expect([m.billed.before, m.unpaid.before, m.overdue.before]).toEqual([null, null, null])
  })
})

describe('[REQ-012] 今日やること', () => {
  it('[SCR-001:default] 期限超過 3・未確認の入金 6・下書き 2。最も古い期限と入金日を持つ', () => {
    const t = todoOf(sample, TODAY)
    expect(t.overdue).toEqual({ count: 3, oldestDue: '2026-10-31', daysOver: 13 })
    expect(t.unmatched).toEqual({ count: 6, oldestReceived: '2026-10-15' })
    expect(t.drafts.count).toBe(2)
    expect(todoTotal(t)).toBe(11)
  })
  it('[SCR-001:todo_empty] 片付いた見本は 3 つとも 0 件', () => {
    const t = todoOf(homeSample('todo_empty'), TODAY)
    expect([t.overdue.count, t.unmatched.count, t.drafts.count]).toEqual([0, 0, 0])
    expect(todoTotal(t)).toBe(0)
  })
  it('[SCR-001:many] 件数は 3 けた、期限超過は 3 けたの日数、取引先名は最長の 60 字', () => {
    const t = todoOf(homeSample('many'), TODAY)
    expect(t.unmatched.count).toBeGreaterThanOrEqual(100)
    expect(t.overdue.daysOver).toBeGreaterThanOrEqual(100)
    expect(LONGEST_CLIENT_NAME.length).toBe(60)
  })
})

describe('[REQ-012] 最近の動き', () => {
  it('新しい順に上限（ACTIVITY_LIMIT）の件数まで。「作りました」は載せず、今より先の時刻の出来事は載せない', () => {
    const ev = recentEvents(sample, NOW)
    expect(ev).toHaveLength(ACTIVITY_LIMIT)
    expect(ev.map((e) => e.at)).toEqual(ev.map((e) => e.at).sort().reverse())
    expect(ev.every((e) => e.kind !== 'created' && new Date(e.at).getTime() <= NOW.getTime())).toBe(true)
    // 11/13 の下書きの保存（10:05）は、いま（09:30）より先なので載せない
    expect(recentEvents(sample, NOW, 50).some((e) => e.at === '2026-11-13T01:05:00Z')).toBe(false)
  })
  it('取引先が見つからなければ「—」（0 や空にしない）', () => {
    const ev = recentEvents({ ...sample, clients: [] }, NOW)
    expect(ev[0].clientName).toBe('—')
  })
})
