import { useRef, useState, type FormEvent } from 'react'
import { AppShell } from '../../app/AppShell'
import type { ScreenDef } from '../../app/types'
import { actions } from '../../app/terms'
import { Button, ErrorSummary, Field, markFor, TextInput, Textarea, useFocusFirstInvalid, type FieldError } from '../../ui'

/**
 * 入力画面（kind=form）の確かめ用の見本。主操作が入力の末尾に来ること、必須と任意の印、誤りの出し方（欄の直下・まとめの一覧・最初の誤り欄へ）を並べる。
 * 製品の画面ではない（screens.yaml には載せない）。画面担当はこのファイルの形を写せる。
 */
const STATES = ['default', 'invalid', 'saving'] as const
const FORM_ID = 'probe-form'

/** 欄の表（form.md 設計段階で示す物）。欄の id はまとめの一覧のリンク先。必須は 2 つ、全部で 5 つ → 必須の欄に「必須」。 */
const fields = [
  { key: 'name', id: 'probe-name', label: '取引先名', required: true, empty: '取引先名を入れてください。' },
  { key: 'mail', id: 'probe-mail', label: 'メール', required: true, empty: 'メールを入れてください。' },
  { key: 'zip', id: 'probe-zip', label: '郵便番号', required: false, empty: '' },
  { key: 'tel', id: 'probe-tel', label: '電話', required: false, empty: '' },
  { key: 'memo', id: 'probe-memo', label: '備考', required: false, empty: '' },
] as const
type Key = (typeof fields)[number]['key']
const count = { required: fields.filter((f) => f.required).length, total: fields.length }

function ProbeForm({ state }: { state: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<Record<Key, string>>({ name: '', mail: '', zip: '', tel: '', memo: '' })
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>(() => (state === 'invalid' ? { name: fields[0].empty, mail: fields[1].empty } : {}))
  const [attempt, setAttempt] = useState(0)
  useFocusFirstInvalid(formRef, attempt)

  const list: FieldError[] = fields.filter((f) => errors[f.key]).map((f) => ({ id: f.id, message: errors[f.key] as string }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: Partial<Record<Key, string>> = {}
    for (const f of fields) if (f.required && values[f.key].trim() === '') next[f.key] = f.empty
    setErrors(next)
    if (Object.keys(next).length > 0) setAttempt((n) => n + 1)
  }
  return (
    <AppShell
      data-scr="SCR-000" state={state} states={STATES} title="入力の見本" current={null} kind="form" width="form"
      back={{ to: 'probe', label: '部品の見本' }}
      secondary={<Button>{actions.cancel}</Button>}
      primary={<Button type="submit" form={FORM_ID} variant="primary" busy={state === 'saving'} busyLabel="登録しています">{actions.createClient}</Button>}
    >
      <form id={FORM_ID} ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-6">
        <ErrorSummary errors={list} />
        {fields.map((f) => (
          <Field
            key={f.key} id={f.id} label={f.label} required={f.required} mark={markFor(f.required, count)} error={errors[f.key]}
            hint={f.key === 'zip' ? '例：060-0042' : f.key === 'mail' ? '請求書の送り先になります。' : undefined}
          >
            {(p) => f.key === 'memo'
              ? <Textarea {...p} value={values.memo} onChange={(e) => setValues({ ...values, memo: e.target.value })} />
              : <TextInput {...p} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} type={f.key === 'mail' ? 'email' : 'text'} />}
          </Field>
        ))}
      </form>
    </AppShell>
  )
}

export const screen: ScreenDef = { id: 'SCR-000', slug: 'probe-form', title: '入力の見本', kind: 'form', states: [...STATES], Component: ProbeForm }
