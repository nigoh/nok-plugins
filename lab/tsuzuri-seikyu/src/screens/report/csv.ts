import { appName, screenNames } from '../../app/terms'
import type { ClientRow, MonthFigure } from './aggregate'

/**
 * 書き出し（G-12）。画面と同じ figures・rows から、整形だけ分けて作る。
 * 数は桁区切りも円も付けない（見出しに単位）。欠損は空欄（0 にしない）。当月は「確定」列に「途中」。UTF-8（BOM つき）、改行は CRLF。
 * 月ごとの表 → 空行 → 取引先別の表 の順で 1 ファイル。
 */
const EOL = '\r\n'

const QUOTE = String.fromCharCode(34)
const NEEDS_QUOTE = [QUOTE, ',', '\r', '\n']

const cell = (v: string | number | null): string => {
  if (v === null) return ''
  if (typeof v === 'number') return String(v)
  if (!NEEDS_QUOTE.some((c) => v.includes(c))) return v
  return `${QUOTE}${v.split(QUOTE).join(QUOTE + QUOTE)}${QUOTE}`
}
const csvLine = (cells: Array<string | number | null>) => cells.map(cell).join(',')

export const CSV_TITLES = { monthly: '月ごと', clients: `${screenNames.clients}別` } as const
export const CSV_HEADERS: { monthly: string[]; clients: string[] } = {
  monthly: ['月', '請求額（円）', '入金額（円）', '確定'],
  clients: [screenNames.clients, '請求額（円）', '入金額（円）', '割合（%）'],
}
const CONFIRMED = { yes: '確定', open: '途中' } as const

export function buildCsv(figures: MonthFigure[], rows: ClientRow[]): string {
  const lines: string[] = [
    csvLine([CSV_TITLES.monthly]),
    csvLine([...CSV_HEADERS.monthly]),
    ...figures.map((f) => csvLine([f.month, f.billed, f.paid, f.open ? CONFIRMED.open : CONFIRMED.yes])),
    '',
    csvLine([CSV_TITLES.clients]),
    csvLine([...CSV_HEADERS.clients]),
    ...rows.map((r) => csvLine([r.name, r.billed, r.paid, r.share])),
  ]
  return lines.join(EOL) + EOL
}

/** 名前に条件（期間）を入れる：つづり請求_売上レポート_2026-06_2026-11.csv */
export const csvFileName = (months: string[]): string => `${appName}_${screenNames.report}_${months[0]}_${months[months.length - 1]}.csv`

/** 端末にファイルを渡す。できなければ例外（呼ぶ側が失敗として知らせる）。 */
export function downloadCsv(name: string, text: string): void {
  const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.append(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}
