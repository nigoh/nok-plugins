import { useEffect, useRef } from 'react'
import { go } from './nav'

/** 行き先。いまの画面を離れたあとに実行する関数（画面を移る・ブラウザの戻る）。 */
export type Proceed = () => void

const GUARD = 'konomiLeaveGuard'
const modified = (e: MouseEvent) => e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey

/** href（「?screen=clients&id=c01」）を、画面を移る関数に直す。 */
function moveOf(href: string): Proceed {
  const p = new URLSearchParams(href.startsWith('?') ? href.slice(1) : href)
  const screen = p.get('screen') ?? 'home'
  p.delete('screen')
  return () => go(screen, Object.fromEntries(p.entries()))
}

/**
 * [MOD-004] 変更があるときだけ、画面を離れる操作を止めて onBlocked に「離れる関数」を渡す（F-09）。
 * 止める物：メニュー・戻りのリンク・本文のリンク（骨格のリンクには onClick を渡せないので、押しを手前で受ける）、ブラウザの戻る。
 * 通す物：同じ URL への移動、修飾キー付き・別のタブで開く押し方。タブを閉じる・再読み込みはブラウザの確認（beforeunload）に任せ、止めきれないことを前提にする。
 *
 * ブラウザの戻る：dirty の間は同じ URL の見張りを 1 つ積み、戻るで見張りが外れたら窓を出す。
 * 戻るで見張りが外れたら、すぐ積み直して（画面は動かない）窓を出す。「離れる」は 2 つぶん戻る。「入力に戻る」は何もしない。
 * dirty が false に戻ったあとも見張りは履歴に残る（同じ URL なので、戻るを 1 度余計に押すことになる。消すと戻る先を壊す恐れがあるので消さない）。
 * 画面は直接呼ばず、AppShell に dirty を渡す。
 */
export function useLeaveGuard(dirty: boolean, onBlocked: (proceed: Proceed) => void) {
  const handler = useRef(onBlocked)
  useEffect(() => { handler.current = onBlocked })
  useEffect(() => {
    if (!dirty) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || modified(e)) return
      const a = (e.target as Element | null)?.closest?.('a[href^="?screen="]')
      if (!a || a.getAttribute('target') === '_blank') return
      const href = a.getAttribute('href') ?? ''
      if (href === window.location.search) return
      e.preventDefault()
      e.stopImmediatePropagation()
      handler.current(moveOf(href))
    }
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    let armed = false
    const arm = () => {
      if (armed) return
      window.history.pushState({ ...(window.history.state ?? {}), [GUARD]: true }, '', window.location.href)
      armed = true
    }
    const onPop = () => {
      if (!armed) return
      // 戻るで見張りが外れ、同じ URL の本体に戻った。画面は動いていないので、すぐ見張りを積み直してから窓を出す。
      armed = false
      arm()
      // 「離れる」は見張りと本体の 2 つぶん戻る。戻っている間に見張りが窓を出し直さないよう、先に外す。
      handler.current(() => { armed = false; window.history.go(-2) })
    }
    arm()
    document.addEventListener('click', onClick, true)
    window.addEventListener('beforeunload', onUnload)
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('beforeunload', onUnload)
      window.removeEventListener('popstate', onPop)
    }
  }, [dirty])
}
