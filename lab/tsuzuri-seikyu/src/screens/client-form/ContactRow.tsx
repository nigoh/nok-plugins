import { Button, cn, Field, markFor, TextInput } from '../../ui'
import { contactId, clientFieldCount, REQUIRED_COUNT, type ContactValues } from './model'
import { Note } from './Note'
import { copy } from './copy'
import type { ClientForm } from './useClientForm'

type Props = { form: ClientForm; index: number; row: ContactValues; removable: boolean }

/** 担当者 1 人ぶん（4 欄を縦に積み、見出しと区切り線で分ける。面にしない：F-08）。1 人目のメールは請求書の宛先なので必須。 */
export function ContactRow({ form, index: i, row, removable }: Props) {
  const e = form.errors
  const count = { required: REQUIRED_COUNT, total: clientFieldCount(form.values) }
  const id = (f: 'name' | 'section' | 'email' | 'phone') => contactId(i, f)
  const first = i === 0
  return (
    <fieldset className={cn('flex min-w-0 flex-col gap-6', !first && 'border-t border-line pt-6')}>
      <legend className="mb-4 p-0 font-bold">{copy.contact.title(i + 1)}</legend>
      <Field id={id('name')} label={copy.label.contactName} error={e[id('name')]} mark={markFor(false, count)}>
        {(p) => <TextInput {...p} value={row.name} onChange={(ev) => form.change(id('name'), ev.target.value)} spellCheck={false} />}
      </Field>
      <Field id={id('section')} label={copy.label.section} error={e[id('section')]} mark={markFor(false, count)}>
        {(p) => <TextInput {...p} value={row.section} onChange={(ev) => form.change(id('section'), ev.target.value)} spellCheck={false} />}
      </Field>
      <div className="flex flex-col gap-2">
        <Field id={id('email')} label={copy.label.mail} hint={first ? copy.hint.mail : undefined} error={e[id('email')]} required={first} mark={markFor(first, count)}>
          {(p) => <TextInput {...p} type="email" value={row.email} onChange={(ev) => form.change(id('email'), ev.target.value)} onBlur={() => form.blur(id('email'))} spellCheck={false} />}
        </Field>
        <Note text={form.notes[id('email')]} />
      </div>
      <div className="flex flex-col gap-2">
        <Field id={id('phone')} label={copy.label.phone} error={e[id('phone')]} mark={markFor(false, count)} className="max-w-56">
          {(p) => <TextInput {...p} type="tel" value={row.phone} onChange={(ev) => form.change(id('phone'), ev.target.value)} onBlur={() => form.blur(id('phone'))} spellCheck={false} />}
        </Field>
        <Note text={form.notes[id('phone')]} />
      </div>
      {removable && <Button variant="quiet" leading="trash" className="self-start" onClick={() => form.removeContact(i)}>{copy.contact.remove(i + 1)}</Button>}
    </fieldset>
  )
}
