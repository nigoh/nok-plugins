import { createContext, useContext } from 'react'

export type ToastInput = {
  message: string
  /** ok=できた / info=お知らせ / fail=できなかった（閉じるまで残る） */
  tone?: 'ok' | 'info' | 'fail'
  /** 「元に戻す」など、結果をやり直す手段。あると少し長く残る。 */
  action?: { label: string; onAction: () => void }
}

export type ToastApi = { show: (t: ToastInput) => void }

export const ToastContext = createContext<ToastApi | null>(null)

/** 画面から短い知らせを出す。ToastProvider の内側（Root か、テストの包み）で使う。 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast は ToastProvider の内側で使ってください')
  return api
}
