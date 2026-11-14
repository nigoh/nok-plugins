import { Field, markFor, TextInput } from '../../ui'
import { ids, REQUIRED_COUNT, clientFieldCount } from './model'
import { copy } from './copy'
import type { ClientForm } from './useClientForm'
import { Note } from './Note'
import { ZipResult } from './ZipResult'

/** 取引先の情報：名前・ふりがな・郵便番号・住所・番地・建物。必須は取引先名だけ。 */
export function InfoSection({ form }: { form: ClientForm }) {
  const { values: v, errors: e, notes } = form
  const count = { required: REQUIRED_COUNT, total: clientFieldCount(v) }
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-large font-bold">{copy.section.info}</h2>
      <div className="flex flex-col gap-6">
        <Field id={ids.name} label={copy.label.name} hint={copy.hint.name} error={e[ids.name]} required mark={markFor(true, count)}>
          {(p) => <TextInput {...p} value={v.name} onChange={(ev) => form.change(ids.name, ev.target.value)} spellCheck={false} />}
        </Field>
        <div className="flex flex-col gap-2">
          <Field id={ids.kana} label={copy.label.kana} hint={copy.hint.kana} error={e[ids.kana]} mark={markFor(false, count)}>
            {(p) => <TextInput {...p} value={v.kana} onChange={(ev) => form.change(ids.kana, ev.target.value)} onBlur={() => form.blur(ids.kana)} spellCheck={false} />}
          </Field>
          <Note text={notes[ids.kana]} />
        </div>
        <div className="flex flex-col gap-2">
          <Field id={ids.zip} label={copy.label.zip} hint={copy.hint.zip} error={e[ids.zip]} mark={markFor(false, count)} className="max-w-48">
            {(p) => <TextInput {...p} value={v.zip} inputMode="numeric" onChange={(ev) => form.change(ids.zip, ev.target.value)} onBlur={() => form.blur(ids.zip)} spellCheck={false} />}
          </Field>
          <ZipResult zip={form.zip} note={notes[ids.zip]} onChoose={form.chooseAddress} onRetry={form.retryZip} />
        </div>
        <Field id={ids.address} label={copy.label.address} hint={copy.hint.address} error={e[ids.address]} mark={markFor(false, count)}>
          {(p) => <TextInput {...p} value={v.address} onChange={(ev) => form.change(ids.address, ev.target.value)} spellCheck={false} />}
        </Field>
        <Field id={ids.street} label={copy.label.street} hint={copy.hint.street} error={e[ids.street]} mark={markFor(false, count)}>
          {(p) => <TextInput {...p} value={v.street} onChange={(ev) => form.change(ids.street, ev.target.value)} spellCheck={false} />}
        </Field>
      </div>
    </section>
  )
}
