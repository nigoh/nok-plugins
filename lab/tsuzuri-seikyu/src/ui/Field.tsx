import { useId, type ReactNode } from 'react'
import { cn } from './cn'
import { Icon } from './Icon'

/** 欄に渡す属性。ラベル・補足・エラーを欄に結び付ける。 */
export type FieldControlProps = {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
  required?: boolean
}

/**
 * ラベルの横に出す印（form.md F-03）。required＝「必須」、optional＝「任意」、none＝印なし。
 * どれにするかは 1 つの入力画面の全欄の数で決まる。Field の外で markFor が決める。
 */
export type FieldMark = 'required' | 'optional' | 'none'

/**
 * 1 つの入力画面の欄の数から、この欄の印を決める（F-03）。
 * 必須が全体の半分より少ない → 必須の欄に「必須」。任意が全体の半分以下 → 任意の欄に「任意」（必須に印なし）。
 * 全部が必須 → 印なし（画面の先頭に「すべて入力してください」を書く）。
 * 例：const mark = (required: boolean) => markFor(required, { required: 2, total: 9 })
 */
export function markFor(required: boolean, count: { required: number; total: number }): FieldMark {
  if (count.required >= count.total) return 'none'
  if (count.required * 2 < count.total) return required ? 'required' : 'none'
  return required ? 'none' : 'optional'
}

const markText = { required: '必須', optional: '任意' } as const

type Props = {
  label: string
  /** 入れ方の補足（規則・例）。14px 以上で、ラベルの下・欄の上に常に出す。例は「例：060-0042」。 */
  hint?: string
  /** 誤りの文。何が起きたかと直し方を書く。あれば欄の直下に絵と文が出て、欄に invalid が付く。まとめの一覧（ErrorSummary）と同じ文にする。 */
  error?: string
  /** 入力が必須か（欄の required 属性になる）。印を出すかどうかは mark で決める。 */
  required?: boolean
  /** 印。省略すると required のとき「必須」、それ以外は印なし。1 画面の欄の数で決めるときは markFor の結果を渡す。 */
  mark?: FieldMark
  /** 欄の id。まとめの一覧のリンク先になるので、画面で決めた名前を渡す。省略すると自動。 */
  id?: string
  /** ラジオやチェックの組など、欄が複数あるときは fieldset と legend で包む。 */
  group?: boolean
  className?: string
  children: (control: FieldControlProps) => ReactNode
}

/** CMP-005。ラベル・補足・欄・エラーを結ぶ。欄は children に渡される属性を展開して置く。 */
export function Field({ label, hint, error, required, mark, id, group, className, children }: Props) {
  const auto = useId()
  const uid = id ?? auto
  const hintId = hint ? `${uid}-hint` : undefined
  const errorId = error ? `${uid}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  const control: FieldControlProps = { id: uid, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required: required || undefined }
  const shown = mark ?? (required ? 'required' : 'none')
  const head = (
    <>
      <span className="font-bold">{label}</span>
      {shown !== 'none' && <span data-field-mark={shown} className="ml-2 text-body font-normal text-muted">{markText[shown]}</span>}
    </>
  )
  const body = (
    <>
      {hint && <p id={hintId} className="text-body text-muted">{hint}</p>}
      {children(control)}
      {error && (
        <p id={errorId} data-field-error className="flex items-start gap-1 text-body text-bad-text">
          <Icon name="alert" size="sm" className="mt-1" />
          <span>{error}</span>
        </p>
      )}
    </>
  )
  if (group) {
    return (
      <fieldset data-cmp="CMP-005" className={cn('flex min-w-0 flex-col gap-2 text-body', className)}>
        <legend className="mb-2 p-0">{head}</legend>
        {body}
      </fieldset>
    )
  }
  return (
    <div data-cmp="CMP-005" className={cn('flex min-w-0 flex-col gap-2 text-body', className)}>
      <label htmlFor={uid}>{head}</label>
      {body}
    </div>
  )
}
