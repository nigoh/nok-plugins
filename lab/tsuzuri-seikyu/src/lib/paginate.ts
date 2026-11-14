/** [CMP-027] ページ送りの 1 ページの件数（既定）。画面で定義し直さない。Pagination もこの値を出す。 */
export const PAGE_SIZE = 20

export type Paged<T> = { rows: T[]; page: number; last: number; total: number; paged: boolean }

/** 1 から数えるページで切る。範囲外のページは端に寄せる。paged は「ページ送りを出す件数か」（1 ページに収まるなら false）。 */
export function paginate<T>(items: readonly T[], page: number, size: number = PAGE_SIZE): Paged<T> {
  const last = Math.max(1, Math.ceil(items.length / size))
  const p = Math.min(Math.max(1, Number.isInteger(page) ? page : 1), last)
  return { rows: items.slice((p - 1) * size, p * size), page: p, last, total: items.length, paged: items.length > size }
}
