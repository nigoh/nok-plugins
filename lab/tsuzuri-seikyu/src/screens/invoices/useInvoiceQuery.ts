import { useLayoutEffect, useMemo } from 'react'
import { replaceParams, useRoute } from '../../app/nav'
import { hasNoConditions, parseQuery, withQuery, type Query } from './query'

/**
 * 一覧の条件（状況・探す語・並べ替え・ページ）と URL の対応。取るデータも見た目も知らない。
 * 読むのは URL だけ。書くときは履歴に積まず置き換える（replaceParams：W-03・REQ-027）。
 * seed は、URL に条件が無いときだけ最初に URL へ入れる値（見本の状態 filtered_empty が、条件のある 0 件を見せるため）。
 */
export function useInvoiceQuery(seed?: Partial<Query>) {
  const { params } = useRoute()
  const query = useMemo(() => parseQuery(params), [params])

  const write = (next: Query) => {
    const p = new URLSearchParams(withQuery('', next))
    replaceParams({ status: p.get('status'), q: p.get('q'), sort: p.get('sort'), page: p.get('page') })
  }
  // 開いたときの 1 回だけ（条件を外したあとに入れ直さない）
  useLayoutEffect(() => { if (seed && hasNoConditions(query)) write({ ...query, ...seed }) }, [])

  return {
    query,
    /** 条件・並び・ページを変える。ページを指定しなければ 1 ページ目に戻す。 */
    update: (patch: Partial<Query>) => write({ ...query, ...patch, page: patch.page ?? 1 }),
    /** 状況と探す語をすべて外す（並びは残す）。 */
    clear: () => write({ ...query, status: 'all', q: '', page: 1 }),
  }
}
