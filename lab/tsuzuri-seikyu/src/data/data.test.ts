import { describe, expect, it } from 'vitest'
import { calcTotals, candidatesFor, clients, describeTerms, displayStatus, dueNoteOf, formatAgo, formatDate, formatDateColumn, formatDateTime, formatNumber, formatYen, MISSING, invoices, invoiceTotal, makeManyInvoices, payments, paymentStatus, TODAY, NOW } from '.'

describe('[REQ-004] 合計の自動計算', () => {
  it('税率ごとに 1 回だけ端数処理する', () => {
    const t = calcTotals([{ quantity: 1, unitPrice: 1005, taxRate: 10 }, { quantity: 1, unitPrice: 1005, taxRate: 10 }, { quantity: 3, unitPrice: 333, taxRate: 8 }], 'floor')
    expect(t.byRate).toEqual([{ rate: 10, base: 2010, tax: 201 }, { rate: 8, base: 999, tax: 79 }])
    expect(t.total).toBe(2010 + 201 + 999 + 79)
  })
  it('端数の扱い（切り捨て・四捨五入・切り上げ）で変わる', () => {
    const l = [{ quantity: 1, unitPrice: 105, taxRate: 10 as const }]
    expect([calcTotals(l, 'floor').tax, calcTotals(l, 'round').tax, calcTotals(l, 'ceil').tax]).toEqual([10, 11, 11])
  })
})

describe('[REQ-003] 金額と日付の整形', () => {
  it('金額は桁区切りと円、日付は日本語の長い形、期間は固定の今日から', () => {
    expect(formatYen(1457500)).toBe('1,457,500円')
    expect(formatDate('2026-02-28')).toBe('2026年2月28日')
    expect(formatDate('2028-02-29')).toBe('2028年2月29日')
    expect(formatAgo('2026-11-13T00:25:00Z', NOW)).toBe('5分前')
  })
})

describe('[REQ-003] 数の書き方（data.md G-05・G-06）', () => {
  it('負の数は U+2212、符号つきは 0 以外に「+」。-0 は 0', () => {
    expect(formatNumber(-1200)).toBe('\u22121,200')
    expect(formatYen(-1200)).toBe('\u22121,200円')
    expect(formatNumber(330, { signed: true })).toBe('+330')
    expect(formatNumber(-330, { signed: true })).toBe('\u2212330')
    expect(formatNumber(0, { signed: true })).toBe('0')
    expect(formatNumber(-0)).toBe('0')
    expect(formatNumber(-1200)).not.toContain('-')
  })
  it('欠損は「—」で、0 とも「0円」とも別。円は付けない', () => {
    expect(MISSING).toBe('\u2014')
    expect(formatNumber(null)).toBe('\u2014')
    expect(formatNumber(undefined)).toBe('\u2014')
    expect(formatNumber(Number.NaN)).toBe('\u2014')
    expect(formatYen(null)).toBe('\u2014')
    expect(formatYen(0)).toBe('0円')
  })
  it('4 桁以上に半角カンマ、年や番号には付けない（金額と件数だけが対象）', () => {
    expect(formatNumber(999)).toBe('999')
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(99999999)).toBe('99,999,999')
  })
})

describe('[REQ-003] 相対の時刻は 24 時間未満だけ（data.md G-07）', () => {
  it('60 秒未満は「たったいま」、1 時間未満は分、24 時間未満は時間', () => {
    expect(formatAgo('2026-11-13T00:29:30Z', NOW)).toBe('たったいま')
    expect(formatAgo('2026-11-13T00:25:00Z', NOW)).toBe('5分前')
    expect(formatAgo('2026-11-12T01:30:00Z', NOW)).toBe('23時間前')
  })
  it('24 時間以上前は日付と時刻。「2日前」とは言わない。今年でなければ年つき', () => {
    expect(formatAgo('2026-11-12T00:30:00Z', NOW)).toBe('11/12(木) 09:30')
    expect(formatAgo('2026-11-10T06:20:00Z', NOW)).toBe('11/10(火) 15:20')
    expect(formatAgo('2025-12-31T06:20:00Z', NOW)).toBe('2025年12月31日 15:20')
    expect(formatDateTime('2026-11-12T06:20:00Z', NOW)).toBe('11/12(木) 15:20')
    for (const iso of ['2026-11-12T00:30:00Z', '2026-11-01T00:30:00Z', '2025-01-01T00:30:00Z']) expect(formatAgo(iso, NOW)).not.toMatch(/日前|時間前|分前/)
  })
  it('一覧の日付の列：同じ列に今年以外が 1 件でもあれば全行を長い形', () => {
    expect(formatDateColumn(['2026-11-13', '2026-12-01'], TODAY)).toEqual(['11/13(金)', '12/1(火)'])
    expect(formatDateColumn(['2026-11-13', '2027-01-04'], TODAY)).toEqual(['2026年11月13日', '2027年1月4日'])
  })
})

describe('[REQ-012] 見本データ', () => {
  it('一覧が成り立つ件数で、状況がそろっている', () => {
    expect(invoices.length).toBeGreaterThanOrEqual(30)
    expect(clients.length).toBe(14)
    const st = new Set(invoices.map((i) => displayStatus(i, TODAY)))
    for (const s of ['draft', 'sent', 'paid', 'overdue', 'void']) expect(st.has(s as never)).toBe(true)
    expect(makeManyInvoices(240)).toHaveLength(240)
  })
  it('未確認の入金に候補が挙がり、差額ありも作れる', () => {
    const un = payments.filter((p) => paymentStatus(p, invoices) === 'unmatched')
    expect(un.length).toBeGreaterThanOrEqual(5)
    const withCand = un.filter((p) => candidatesFor(p, invoices, clients).length > 0)
    expect(withCand.length).toBeGreaterThanOrEqual(3)
    const diff = candidatesFor(payments.find((p) => p.payerName.includes('アカシア'))!, invoices, clients)[0]
    expect(diff.difference).toBe(330)
    expect(invoiceTotal(diff.invoice)).toBe(242000)
  })
  it('取引先の締め日・支払期限の言い方', () => {
    expect(describeTerms(clients[0].terms)).toBe('月末締め・翌月末払い')
    expect(describeTerms(clients[3].terms)).toBe('月末締め・翌々月10日払い')
  })
})

describe('[REQ-008] 大量の見本は 1 度だけ作って共有する', () => {
  it('manyInvoices は同じ配列を返し、中身は makeManyInvoices と同じ id', async () => {
    const { manyInvoices } = await import('./sample')
    expect(manyInvoices()).toBe(manyInvoices())
    expect(manyInvoices().map((i) => i.id)).toEqual(makeManyInvoices().map((i) => i.id))
    expect(makeManyInvoices()[0].id).toBe('inv-m037')
    expect(makeManyInvoices().map((i) => i.number)).toEqual(makeManyInvoices().map((i) => i.number))
    expect(manyInvoices()).toHaveLength(240)
  })
})

describe('[MOD-008] 請求書から導く物：支払期限の補足', () => {
  const of = (status: string) => invoices.find((i) => displayStatus(i, TODAY) === status)!
  it('[REQ-003] 入金を待つ請求書（送付済み・期限超過）だけに、日数の補足を返す', () => {
    const sent = of('sent')
    expect(dueNoteOf(sent, TODAY)).toMatch(/^(あと\d+日|今日まで)$/)
    expect(dueNoteOf(of('overdue'), TODAY)).toMatch(/^\d+日超過$/)
  })
  it('[REQ-003] 下書き・入金済み・取り消し済みには補足を出さない', () => {
    expect([of('draft'), of('paid'), of('void')].map((i) => dueNoteOf(i, TODAY))).toEqual([null, null, null])
  })
  it('[REQ-003] 期限の日が今日なら「今日まで」、過ぎた日数は数字で言う', () => {
    const sent = { ...of('sent'), dueOn: TODAY }
    expect(dueNoteOf(sent, TODAY)).toBe('今日まで')
    expect(dueNoteOf({ ...sent, dueOn: '2026-11-10' }, TODAY)).toBe('3日超過')
  })
})
