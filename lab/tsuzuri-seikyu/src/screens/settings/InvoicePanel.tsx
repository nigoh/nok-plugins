import { formatYen, TODAY } from '../../data'
import { Field, Segmented, TextField } from '../../ui'
import { ROUNDING_LABEL, ROUNDING_OPTIONS } from './fields'
import { numberExample, ROUNDING_EXAMPLE_BASE, roundingExamples } from './model'
import { copy } from './copy'
import type { SettingsForm } from './useSettingsForm'

/** 請求書の決まり。番号の頭と、税の端数処理。どちらも例を添えて、効き方が先に分かるようにする。 */
export function InvoicePanel({ form }: { form: SettingsForm }) {
  const prefix = form.values.numberPrefix
  const example = numberExample(prefix, form.scenario.issuedThisYear, TODAY)
  const examples = roundingExamples()
  const parts = examples.map((e) => copy.roundingPart(e.label, formatYen(e.tax))).join('、')
  const tax = String(ROUNDING_EXAMPLE_BASE * 0.1)
  return (
    <div className="flex flex-col gap-6">
      <TextField {...form.fieldProps('numberPrefix', prefix === '' ? undefined : copy.nextNumber(example))} className="max-w-64" />
      <Field group label={ROUNDING_LABEL} hint={copy.roundingExample(formatYen(ROUNDING_EXAMPLE_BASE), tax, parts)}>
        {() => (
          <Segmented
            label={copy.roundingPick}
            options={ROUNDING_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={form.values.rounding}
            disabled={form.saving}
            onChange={(v) => form.setRounding(ROUNDING_OPTIONS.find((o) => o.value === v)?.value ?? form.values.rounding)}
          />
        )}
      </Field>
    </div>
  )
}
