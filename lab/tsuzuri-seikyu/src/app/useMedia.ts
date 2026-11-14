import { useSyncExternalStore } from 'react'

/**
 * 画面の幅で「置くもの」自体を替えるときだけ使う（骨格の層だけ。部品の組み替えは枠の幅＝コンテナクエリ）。
 * matchMedia が無い環境（テスト）では wide を既定にする。
 */
export function useMedia(query: string, fallback = true): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : fallback),
    () => fallback,
  )
}
