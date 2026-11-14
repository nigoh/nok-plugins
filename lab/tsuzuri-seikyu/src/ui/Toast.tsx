import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
import { ToastContext, type ToastApi, type ToastInput } from './useToast'

type Item = ToastInput & { id: number }

const icons: Record<NonNullable<ToastInput['tone']>, IconName> = { ok: 'circle-check', info: 'info', fail: 'circle-x' }
/** 残る長さ。出したあとの「保つ時間」で、動きの長さではない。 */
const HOLD_MS = 6000
const HOLD_WITH_ACTION_MS = 10000

/** 地と逆の明るさの上のボタン。色は fg/bg の入れ替えで、Button の種類は使わない。 */
const inverseButton = 'inline-flex min-h-11 items-center justify-center rounded-control text-bg transition duration-(--dur-instant) hover:bg-bg/15 active:bg-bg/25 focus-visible:outline-bg'

function ToastItem({ item, onDone }: { item: Item; onDone: (id: number) => void }) {
  const tone = item.tone ?? 'info'
  useEffect(() => {
    if (tone === 'fail') return
    const t = window.setTimeout(() => onDone(item.id), item.action ? HOLD_WITH_ACTION_MS : HOLD_MS)
    return () => window.clearTimeout(t)
  }, [item, tone, onDone])
  return (
    <div role={tone === 'fail' ? 'alert' : 'status'} className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-card bg-fg p-3 pl-4 text-body text-bg shadow-lift animate-rise-in">
      <Icon name={icons[tone]} />
      <p className="min-w-0 flex-1">{item.message}</p>
      {item.action && (
        <button type="button" className={`${inverseButton} px-3 font-bold underline`} onClick={() => { item.action?.onAction(); onDone(item.id) }}>{item.action.label}</button>
      )}
      <button type="button" aria-label="知らせを閉じる" title="知らせを閉じる" className={`${inverseButton} size-11`} onClick={() => onDone(item.id)}>
        <Icon name="x" />
      </button>
    </div>
  )
}

/** CMP-016。下に出る短い知らせ（地と逆の明るさ）。Root に 1 つ置く。画面が替わっても残る。 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const done = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), [])
  const api = useMemo<ToastApi>(() => ({ show: (t) => setItems((xs) => [...xs.slice(-2), { ...t, id: Date.now() + Math.random() }]) }), [])
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div data-cmp="CMP-016" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 p-4 pb-20 md:pb-8">
        {items.map((it) => <ToastItem key={it.id} item={it} onDone={done} />)}
      </div>
    </ToastContext.Provider>
  )
}
