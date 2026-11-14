import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconButton } from './IconButton'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** 副の操作（「やめる」）。DOM でも見た目でも主の前（やめる→主。縦に積むときは主が下の親指側。D-05・F-10）。 */
  secondary?: ReactNode
  /** 主の操作。1 つだけ。 */
  primary?: ReactNode
  /** false なら、外側を押す・Esc では閉じない（保存中など）。 */
  dismissible?: boolean
}

/**
 * CMP-012。標準の dialog 要素で作った窓（モーダル）。出入りは --dur-base で濃さと 8px の移動。
 * スマホ幅は下から出す。中身は開いている間だけ作る（入力は開くたびに空から）。
 */
export function Dialog({ open, onClose, title, children, secondary, primary, dismissible = true }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      data-cmp="CMP-012"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => { if (!dismissible) e.preventDefault() }}
      onClick={(e) => { if (dismissible && e.target === e.currentTarget) onClose() }}
      className="m-auto w-full max-w-lg rounded-panel bg-panel p-0 text-fg shadow-lift open:animate-rise-in backdrop:animate-fade-in max-md:mb-0 max-md:max-w-full max-md:rounded-b-none"
    >
      {open && (
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-large font-bold">{title}</h2>
            {dismissible && <IconButton label="閉じる" icon="x" onClick={onClose} />}
          </div>
          <div className="text-body">{children}</div>
          {(secondary || primary) && <div className="flex flex-col gap-2 md:flex-row md:justify-end">{secondary}{primary}</div>}
        </div>
      )}
    </dialog>
  )
}
