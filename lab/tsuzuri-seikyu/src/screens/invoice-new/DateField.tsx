import type { ReactNode } from 'react'
import { messages } from '../../app/terms'
import { Field, TextInput, type FieldMark } from '../../ui'

type Props = {
  id: string
  label: string
  value: string
  mark: FieldMark
  hint?: string
  error?: string
  /** 全角などを半角に直したとき true。 */
  adjusted: boolean
  onChange: (text: string) => void
  onBlur: () => void
  /** 欄の下に置く物（「自動に戻す」・期限の知らせ）。 */
  below?: ReactNode
}

/** 日付の入力欄 1 つ。文字と誤りだけを知っていて、日付の意味は知らない（読み取りは画面の hook）。 */
export function DateField({ id, label, value, mark, hint, error, adjusted, onChange, onBlur, below }: Props) {
  return (
    <Field id={id} label={label} required mark={mark} hint={hint} error={error}>
      {(p) => (
        <>
          <TextInput {...p} type="text" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} autoComplete="off" />
          {adjusted && <p role="status" className="text-body text-muted">{messages.widened}</p>}
          {below}
        </>
      )}
    </Field>
  )
}
