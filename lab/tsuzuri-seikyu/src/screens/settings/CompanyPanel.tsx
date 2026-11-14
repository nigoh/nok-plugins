import { TextField } from '../../ui'
import type { SettingsForm } from './useSettingsForm'

/** 自社の情報。請求書の差出人と振込先に載る物。欄の定義は fields.ts、値と誤りは form.fieldProps。 */
export function CompanyPanel({ form }: { form: SettingsForm }) {
  const f = form.fieldProps
  return (
    <div className="flex flex-col gap-6">
      <TextField {...f('name')} autoComplete="organization" />
      <TextField {...f('zip')} inputMode="numeric" autoComplete="postal-code" className="max-w-48" />
      <TextField {...f('address')} autoComplete="street-address" />
      <TextField {...f('phone')} type="tel" autoComplete="tel" className="max-w-64" />
      <TextField {...f('email')} type="email" autoComplete="email" className="max-w-xl" />
      <TextField {...f('registrationNo')} className="max-w-64" />
      <TextField {...f('bank')} rows={3} />
    </div>
  )
}
