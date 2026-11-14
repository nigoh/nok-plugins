import { Checkbox, Field } from '../../ui'
import { NOTIFY_LABEL, NOTIFY_OPTIONS } from './fields'
import type { SettingsForm } from './useSettingsForm'

/** 通知。メールで知らせる場面を選ぶ。保存で確定する選択なのでチェック（D-02）。 */
export function NotifyPanel({ form }: { form: SettingsForm }) {
  return (
    <Field group label={NOTIFY_LABEL}>
      {() => (
        <div className="flex flex-col">
          {NOTIFY_OPTIONS.map((o) => (
            <Checkbox key={o.key} label={o.label} checked={form.values[o.key]} disabled={form.saving} onChange={(e) => form.setNotify(o.key, e.target.checked)} />
          ))}
        </div>
      )}
    </Field>
  )
}
