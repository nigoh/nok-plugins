import { describe, expect, it } from 'vitest'
import { addMonths, checkEach, checkRule, dueNote, lastDayOf, foldForSearch, formatError, formatMonthOnly, formatNumber, matchesWords, monthName, MAX_YEN, pad, paginate, PAGE_SIZE, readDate, readQuantity, readYen, settleDate, settleYen, toHalf, toHalfDigits, wasWidened } from '.'

const full = (s: string) => s.replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xfee0))

describe('[MOD-001] lib/format：月の名前は 1 か所', () => {
  it('[REQ-008] 月の名前は「6月」。「6月月」にならない', () => {
    expect(monthName(6)).toBe('6月')
    expect(monthName('2026-06')).toBe('6月')
    expect(monthName('2026-11-13')).toBe('11月')
    expect(formatMonthOnly('2026-06-01')).toBe('6月')
    expect(formatMonthOnly('2026-06-01')).not.toMatch(/月月/)
  })
  it('[REQ-008] data から出し直しても同じ関数', async () => {
    const data = await import('../data')
    expect(data.formatNumber).toBe(formatNumber)
    expect(data.monthName).toBe(monthName)
  })
})

describe('[MOD-002] lib/normalize：全角→半角', () => {
  it('[REQ-009] 全角の数字・英字・ハイフンの種類を半角にそろえ、直したときだけ知らせる', () => {
    expect(toHalf(full('060') + '−' + full('0042'))).toBe('060-0042')
    expect(toHalf('ＡＢＣ＠ｅｘａｍｐｌｅ．ｊｐ')).toBe('ABC@example.jp')
    expect(toHalfDigits(' 011 ー 555 ')).toBe('011-555')
    expect(wasWidened(full('123'))).toBe(true)
    expect(wasWidened('123')).toBe(false)
    expect(wasWidened('  123  ')).toBe(false)
    expect(wasWidened('')).toBe(false)
    expect(wasWidened('北斗印刷')).toBe(false)
  })
})

describe('[MOD-002] lib/normalize：日付の読み', () => {
  const today = '2026-11-13'
  const ok = (text: string) => readDate(text, today)
  it('[REQ-009] 西暦・8 桁・全角・区切りいろいろを読む', () => {
    for (const t of ['2026年11月13日', '2026/11/13', '2026-11-13', '2026.11.13', '20261113', full('2026') + '/' + full('11') + '/' + full('13'), '2026‐11‐13']) expect(ok(t), t).toEqual({ kind: 'ok', ymd: '2026-11-13' })
  })
  it('[REQ-009] 和暦（令和・平成・昭和・R/H/S・元年）と年なしを読む', () => {
    expect(ok('令和8年11月13日')).toEqual({ kind: 'ok', ymd: '2026-11-13' })
    expect(ok('R8.11.13')).toEqual({ kind: 'ok', ymd: '2026-11-13' })
    expect(ok('r8-11-13')).toEqual({ kind: 'ok', ymd: '2026-11-13' })
    expect(ok('令和元年5月1日')).toEqual({ kind: 'ok', ymd: '2019-05-01' })
    expect(ok('平成30年12月31日')).toEqual({ kind: 'ok', ymd: '2018-12-31' })
    expect(ok('昭和64年1月7日')).toEqual({ kind: 'ok', ymd: '1989-01-07' })
    expect(ok('11月30日')).toEqual({ kind: 'ok', ymd: '2026-11-30' })
    expect(ok('3/5')).toEqual({ kind: 'ok', ymd: '2026-03-05' })
  })
  it('[REQ-009] 読めないものは bad、空は empty。実在しない日・元号の範囲外・桁違いは bad', () => {
    expect(ok('')).toEqual({ kind: 'empty' })
    expect(ok('  ')).toEqual({ kind: 'empty' })
    for (const t of ['あした', '2026年11月31日', '平成31年5月1日', '昭和64年1月8日', '0001-01-01', '2026-13-01', '11月']) expect(ok(t), t).toEqual({ kind: 'bad' })
  })
  it('[REQ-009] 欄を離れた時は読めたものだけ書き換え、直したときだけ知らせる', () => {
    expect(settleDate('20261113', today)).toEqual({ value: '2026年11月13日', adjusted: false })
    expect(settleDate(full('2026') + '/11/13', today)).toEqual({ value: '2026年11月13日', adjusted: true })
    expect(settleDate('あした', today)).toEqual({ value: 'あした', adjusted: false })
  })
})

describe('[MOD-002] lib/normalize：金額・数量の読み', () => {
  it('[REQ-009] 桁区切り・円・円記号・全角を受ける', () => {
    for (const t of ['112200', '112,200', '112200円', '¥112,200', '￥112,200', full('112200'), ' 112 200 ']) expect(readYen(t), t).toEqual({ kind: 'ok', value: 112200 })
  })
  it('[REQ-009] 空・数字でない・上限超え', () => {
    expect(readYen('')).toEqual({ kind: 'empty' })
    expect(readYen('円')).toEqual({ kind: 'empty' })
    expect(readYen('abc')).toEqual({ kind: 'bad' })
    expect(readYen('-5')).toEqual({ kind: 'bad' })
    expect(readYen('1.5')).toEqual({ kind: 'bad' })
    expect(readYen(String(MAX_YEN + 1))).toEqual({ kind: 'over' })
    expect(readYen('100000000', 99_999_999)).toEqual({ kind: 'over' })
  })
  it('[REQ-009] 数量は 0 より大きく、小数は 2 桁まで', () => {
    expect(readQuantity('2.5')).toEqual({ kind: 'ok', value: 2.5 })
    expect(readQuantity('0')).toEqual({ kind: 'bad' })
    expect(readQuantity('1.234')).toEqual({ kind: 'bad' })
    expect(readQuantity('10000000')).toEqual({ kind: 'over' })
  })
  it('[REQ-009] 欄を離れた時は桁区切りにそろえる', () => {
    expect(settleYen('112200')).toEqual({ value: '112,200', adjusted: false })
    expect(settleYen(full('112200'))).toEqual({ value: '112,200', adjusted: true })
    expect(settleYen('abc')).toEqual({ value: 'abc', adjusted: false })
  })
})

describe('[MOD-002] lib/normalize：探す語', () => {
  it('[REQ-006] 全角・大文字小文字・ひらがな・空白・中点の違いを無視する', () => {
    expect(foldForSearch('ほくと')).toBe(foldForSearch('ホクト'))
    expect(foldForSearch('ＡＢＣ')).toBe(foldForSearch('abc'))
    expect(foldForSearch('北斗 印刷')).toBe(foldForSearch('北斗印刷'))
    expect(foldForSearch('ホクト・インサツ')).toBe(foldForSearch('ほくといんさつ'))
  })
})

describe('[MOD-006] lib/paginate：1 ページの件数は 1 か所', () => {
  const items = Array.from({ length: 45 }, (_, i) => i)
  it('[REQ-013] 既定は PAGE_SIZE 件。範囲外は端に寄せ、1 ページに収まるなら paged=false', () => {
    expect(PAGE_SIZE).toBe(20)
    const p2 = paginate(items, 2)
    expect(p2.rows).toHaveLength(20)
    expect(p2.rows[0]).toBe(20)
    expect(p2).toMatchObject({ page: 2, last: 3, total: 45, paged: true })
    expect(paginate(items, 99).page).toBe(3)
    expect(paginate(items, 99).rows).toHaveLength(5)
    expect(paginate(items, 0).page).toBe(1)
    expect(paginate(items, Number.NaN).page).toBe(1)
    expect(paginate(items.slice(0, 20), 1).paged).toBe(false)
    expect(paginate([], 1)).toMatchObject({ rows: [], page: 1, last: 1, paged: false })
  })
})

describe('[MOD-001] lib/format：桁をそろえる・支払期限の補足は 1 か所', () => {
  it('[REQ-003] pad は既定 2 桁。連番は桁数を渡す', () => {
    expect([pad(5), pad(12), pad(7, 3), pad(42, 4)]).toEqual(['05', '12', '007', '0042'])
  })
  it('[REQ-003] 支払期限の補足は「あと3日」「今日まで」「3日超過」（G-07）', () => {
    expect([dueNote(17), dueNote(1), dueNote(0), dueNote(-1), dueNote(-30)]).toEqual(['あと17日', 'あと1日', '今日まで', '1日超過', '30日超過'])
  })
})

describe('[MOD-001] lib/format：月の計算は 1 か所', () => {
  it('[REQ-003] 月の最終日と、月を足す・引く（年をまたぐ）', () => {
    expect([lastDayOf(2026, 2), lastDayOf(2028, 2), lastDayOf(2026, 11), lastDayOf(2026, 12)]).toEqual([28, 29, 30, 31])
    expect([addMonths(2026, 11, 1), addMonths(2026, 11, 2), addMonths(2026, 1, -1), addMonths(2025, 12, 0)]).toEqual([[2026, 12], [2027, 1], [2025, 12], [2025, 12]])
  })
})

describe('[MOD-002] lib/normalize：探す語との照合', () => {
  const hay = ['株式会社北斗印刷', 'ホクトインサツ', 'INV-2026-0001']
  it('[REQ-018] 語が空なら全部に合い、空白（全角も）で分けた語は「かつ」', () => {
    expect(matchesWords(hay, '')).toBe(true)
    expect(matchesWords(hay, ' \u3000 ')).toBe(true)
    expect(matchesWords(hay, '北斗 印刷')).toBe(true)
    expect(matchesWords(hay, '印刷\u3000北斗')).toBe(true)
    expect(matchesWords(hay, '北斗 大通')).toBe(false)
  })
  it('[REQ-018] 全角半角・大小・かなの違いは見ない。照合先の欄どうしをまたいで合わせない', () => {
    expect(matchesWords(hay, 'ほくと')).toBe(true)
    expect(matchesWords(hay, 'ｉｎｖ-2026')).toBe(true)
    expect(matchesWords(['北斗', '印刷'], '斗印')).toBe(false)
  })
})

describe('[MOD-009] lib/check：欄の検査の骨', () => {
  const rule = { key: 'email', required: true, empty: 'メールを入れてください。', bad: 'メールの形で入力してください。', valid: (v: string) => v.includes('@') }
  it('[REQ-009] 空の必須は empty、必須でない空は誤りにしない、入っていれば形を見る', () => {
    expect(checkRule(rule, '')).toBe('メールを入れてください。')
    expect(checkRule(rule, '  ')).toBe('メールを入れてください。')
    expect(checkRule({ ...rule, required: false }, '')).toBeUndefined()
    expect(checkRule(rule, 'abc')).toBe('メールの形で入力してください。')
    expect(checkRule(rule, 'a@b.jp')).toBeUndefined()
  })
  it('[REQ-009] formatError は空と、形の検査が無い欄を見ない', () => {
    expect(formatError(rule, '')).toBeUndefined()
    expect(formatError({ bad: 'x' }, 'なんでも')).toBeUndefined()
    expect(formatError(rule, 'abc')).toBe('メールの形で入力してください。')
  })
  it('[REQ-009] checkEach は誤りのある欄だけを集め、欄を回す順を変えない', () => {
    const found = checkEach(['a', 'b', 'c'] as const, (k) => (k === 'b' ? null : k === 'c' ? '誤り' : undefined))
    expect(found).toEqual({ c: '誤り' })
    expect(Object.keys(checkEach(['z', 'a'], () => 'x'))).toEqual(['z', 'a'])
  })
})
