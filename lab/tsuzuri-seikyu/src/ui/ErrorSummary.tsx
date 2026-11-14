import { Notice } from './Notice'

/** まとめの一覧の 1 行。id は Field の id、message は Field の error と同じ文。 */
export type FieldError = { id: string; message: string }

type Props = {
  errors: FieldError[]
  className?: string
}

/**
 * CMP-031。送ったとき誤りが 2 件以上のときだけ、画面の先頭に出す誤りの一覧（form.md F-04）。
 * 失敗の知らせ（role=alert）の形。フォーカスは一覧に移さない（最初の誤り欄へ移す：useFocusFirstInvalid）。
 * 1 件なら出さない（欄の直下の文だけ）。各行は欄へのリンクで、文は欄の直下と同じ。
 */
export function ErrorSummary({ errors, className }: Props) {
  if (errors.length < 2) return null
  return (
    <div data-cmp="CMP-031" className={className}>
      <Notice tone="fail" title={`${errors.length}か所を直してください`}>
        <ul className="flex flex-col">
          {errors.map((e) => (
            <li key={e.id}>
              <a
                href={`#${e.id}`}
                className="inline-flex min-h-11 items-center underline"
                onClick={(ev) => {
                  const el = document.getElementById(e.id)
                  if (!el) return
                  ev.preventDefault()
                  el.focus()
                }}
              >
                {e.message}
              </a>
            </li>
          ))}
        </ul>
      </Notice>
    </div>
  )
}
