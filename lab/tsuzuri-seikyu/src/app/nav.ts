import { useCallback, useSyncExternalStore } from 'react'

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
if (typeof window !== 'undefined') window.addEventListener('popstate', emit)

export type Route = { screen: string | null; state: string | null; params: URLSearchParams }

let cache: { key: string; route: Route } | null = null
function read(): Route {
  const key = (window as unknown as { __konomiSearch?: string }).__konomiSearch ?? window.location.search
  if (cache && cache.key === key) return cache.route
  const params = new URLSearchParams(key)
  cache = { key, route: { screen: params.get('screen'), state: params.get('state'), params } }
  return cache.route
}

export function useRoute(): Route {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, read)
}

/** 画面を移る。履歴に積むので「戻る」で戻れる。 */
export function go(screen: string, extra: Record<string, string> = {}) {
  const p = new URLSearchParams({ screen, ...extra })
  window.history.pushState(null, '', '?' + p.toString())
  window.scrollTo(0, 0)
  emit()
}

/**
 * [MOD-003] 履歴を積まない移動。画面の中の軽い切り替え（絞り込み・並べ替え・ページ・タブ・開いた行）と、
 * 「削除のあと一覧へ移る」のような、戻るで消えた物へ戻したくない移動に使う（W-03・W-06）。スクロールは動かさない。
 * 画面で window.history.replaceState を直接呼ばない（structure.test が止める）。
 */
export function replace(screen: string, extra: Record<string, string> = {}) {
  const p = new URLSearchParams({ screen, ...extra })
  window.history.replaceState(window.history.state, '', '?' + p.toString())
  emit()
}

/**
 * いまの画面の URL の値をまとめて書き換える（履歴は積まない）。null か空の文字は外す。screen と state は残す。
 * 一覧の条件（探す語・並び順・ページ）のように、いくつかの値を 1 度に変えるときに使う。
 */
export function replaceParams(patch: Record<string, string | null | undefined>) {
  const p = new URLSearchParams(window.location.search)
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined || v === '') p.delete(k)
    else p.set(k, v)
  }
  const search = p.toString()
  if (search === window.location.search.replace(/^\?/, '')) return
  window.history.replaceState(window.history.state, '', search === '' ? window.location.pathname : '?' + search)
  emit()
}

/**
 * [MOD-003] URL の値 1 つの読み書き。既定の値は URL に書かない（外す）ので、既定のときの URL はきれいなまま。
 * 書き換えは履歴に積まない。ブラウザの戻る・進む、メニューから開き直したときは URL の値に合う。
 * set(null) か set(既定の値) で外す。ページ番号のような数は文字で受け、画面で数に直す（paramNumber）。
 */
export function useUrlParam(name: string, fallback = ''): [string, (value: string | null) => void] {
  const { params } = useRoute()
  const value = params.get(name) ?? fallback
  const set = useCallback((next: string | null) => replaceParams({ [name]: next === fallback ? null : next }), [name, fallback])
  return [value, set]
}

/** URL の文字を 1 以上の整数に（ページ番号など）。読めなければ既定。 */
export function paramNumber(value: string, fallback = 1): number {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n : fallback
}

export function hrefTo(screen: string, extra: Record<string, string> = {}) {
  return '?' + new URLSearchParams({ screen, ...extra }).toString()
}
