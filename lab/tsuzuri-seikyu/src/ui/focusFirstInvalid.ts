import { useEffect, type RefObject } from 'react'

/** 送る前の確かめで誤りがあったとき、最初の誤り欄へ移る（F-04）。誤りを揺らして知らせない。 */
export function focusFirstInvalid(container: ParentNode): boolean {
  const el = container.querySelector<HTMLElement>('[aria-invalid="true"]')
  if (!el) return false
  el.focus()
  return true
}

/**
 * 誤りを画面に出したあと、最初の誤り欄へフォーカスを移す。
 * 誤りの state を直してすぐ focusFirstInvalid を呼ぶと、欄はまだ invalid になっていない（描き直しの前）。
 * そこで「送ろうとした回数」を数え、増えたら描き直しのあとに移る。誤りが 0 件なら何もしない。
 * 使い方：const [attempt, setAttempt] = useState(0)／送るとき誤りがあれば setErrors(…); setAttempt((n) => n + 1)／useFocusFirstInvalid(formRef, attempt)
 */
export function useFocusFirstInvalid(container: RefObject<ParentNode | null>, attempt: number): void {
  useEffect(() => {
    if (attempt > 0 && container.current) focusFirstInvalid(container.current)
  }, [attempt, container])
}
