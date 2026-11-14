import type { HTMLInputTypeAttribute, ReactNode } from 'react'
import { Field, type FieldMark } from './Field'
import { Textarea } from './Textarea'
import { TextInput } from './TextInput'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  /** 欄の id。誤りの一覧のリンク先になるので画面で決める。 */
  id?: string
  hint?: string
  error?: string
  required?: boolean
  mark?: FieldMark
  /** 全角などを直したあとの知らせ（terms の messages.widened）。補足の末尾に続ける。 */
  note?: string
  /** 2 以上で複数行（Textarea）。 */
  rows?: number
  /** 欄を離れたとき（形式の誤りを出す・全角を直す）。 */
  onBlur?: () => void
  type?: HTMLInputTypeAttribute
  inputMode?: 'text' | 'numeric' | 'tel' | 'email'
  autoComplete?: string
  maxLength?: number
  disabled?: boolean
  align?: 'start' | 'end'
  leading?: ReactNode
  trailing?: ReactNode
  /** 外側の配置（幅の上限など）だけに使う。 */
  className?: string
}

/**
 * [CMP-039] 文字を入れる欄 1 つ。Field（ラベル・補足・必須の印・誤り）と TextInput／Textarea を結ぶ。
 * 画面ごとに作られていた「同じ役で props が別」の TextField を 1 つにした。値と変更は文字だけ受ける（イベントを持ち回らない）。
 * 全角の直し・誤りの文は画面（model）が持つ。ここは見た目と結びつけだけ。
 */
export function TextField({ label, value, onChange, id, hint, error, required, mark, note, rows, align, leading, trailing, className, onBlur, type = 'text', inputMode, autoComplete, maxLength, disabled }: Props) {
  const shown = [hint, note].filter(Boolean).join(' ') || undefined
  return (
    <div data-cmp="CMP-039" className="contents">
      <Field id={id} label={label} hint={shown} error={error} required={required} mark={mark} className={className}>
        {(p) => (rows && rows > 1
          ? <Textarea {...p} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} autoComplete={autoComplete} maxLength={maxLength} disabled={disabled} spellCheck={false} />
          : <TextInput {...p} type={type} inputMode={inputMode} autoComplete={autoComplete} maxLength={maxLength} disabled={disabled} spellCheck={false} align={align} leading={leading} trailing={trailing} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />)}
      </Field>
    </div>
  )
}
