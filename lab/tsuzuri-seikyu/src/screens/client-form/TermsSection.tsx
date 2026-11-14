import { describeTerms } from '../../data'
import { Field, markFor, Segmented, Select } from '../../ui'
import { dayOptions, clientFieldCount, ids, monthOptions, REQUIRED_COUNT, termsOf } from './model'
import { Note } from './Note'
import { copy } from './copy'
import type { ClientForm } from './useClientForm'

/** 支払いの条件：締め日と支払期限（選択肢で入れる）。新規は設定の標準の条件から入り、出どころを書く（F-07）。 */
export function TermsSection({ form, edit }: { form: ClientForm; edit: boolean }) {
  const { values: v, errors: e } = form
  const count = { required: REQUIRED_COUNT, total: clientFieldCount(v) }
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-large font-bold">{copy.section.terms}</h2>
      <div className="flex flex-col gap-6">
        <Field id={ids.closing} label={copy.label.closing} mark={markFor(false, count)}>
          {(p) => <Select {...p} options={dayOptions(v.closing)} value={v.closing} onChange={(ev) => form.change(ids.closing, ev.target.value)} className="max-w-48" />}
        </Field>
        <Field
          group id={ids.payDay} label={copy.label.payment} hint={edit ? copy.hint.paymentEdit : copy.hint.paymentNew}
          error={e[ids.payDay]} mark={markFor(false, count)}
        >
          {(p) => (
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Segmented label={copy.terms.monthLabel} options={monthOptions} value={v.payMonths} onChange={(x) => form.change(ids.payMonths, x)} className="self-start" />
              <Select
                id={p.id} aria-describedby={p['aria-describedby']} aria-invalid={p['aria-invalid']} aria-label={copy.terms.dayLabel}
                options={dayOptions(v.payDay)} value={v.payDay} onChange={(ev) => form.change(ids.payDay, ev.target.value)} className="md:w-40"
              />
            </div>
          )}
        </Field>
        <div className="flex flex-col gap-1">
          <p aria-live="polite" className="text-body">{copy.terms.now(describeTerms(termsOf(v)))}</p>
          {!edit && !form.termsTouched && <Note text={copy.terms.origin} />}
        </div>
      </div>
    </section>
  )
}
