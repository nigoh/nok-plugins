import { Field, Segmented, Select } from '../../ui'
import { copy } from './copy'
import { roundingOptions, taxRateOptions, termsOptions, type StepProps } from './model'
import { StepField } from './StepPanel'

/** 2 段目 請求の決まり。全部必須なので印は付けず、先頭に「すべて入力してください。」を書く（F-03）。選ぶ欄は誤りが起きない。 */
export function RulesStep(props: StepProps) {
  const { values, onChange } = props
  return (
    <>
      <p className="text-body text-muted">{copy.allRequired}</p>
      <StepField {...props} step={2} field="prefix" />
      <Field group label="税の端数" hint="消費税の端数は、税率ごとに1回だけ処理します。">
        {() => <Segmented label="税の端数" options={roundingOptions} value={values.rounding} onChange={(v) => onChange('rounding', roundingOptions.find((o) => o.value === v)?.value ?? values.rounding)} />}
      </Field>
      <Field group label="標準の税率" hint="明細に入る税率の初期値です。明細ごとに変えられます。">
        {() => <Segmented label="標準の税率" options={taxRateOptions} value={String(values.taxRate)} onChange={(v) => onChange('taxRate', v === '8' ? 8 : 10)} />}
      </Field>
      <Field id="setup-terms" label="支払条件" hint="取引先に決まりがなければ、この条件で支払期限が入ります。">
        {(p) => <Select {...p} options={termsOptions} value={values.termsKey} onChange={(e) => onChange('termsKey', e.target.value)} />}
      </Field>
      <StepField {...props} step={2} field="bank" />
    </>
  )
}
