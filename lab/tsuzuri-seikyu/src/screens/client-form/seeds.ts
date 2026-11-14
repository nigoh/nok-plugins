import type { ClientTerms } from '../../data'
import { blankClientValues, blankContact, type FormValues } from './model'
import type { Seed } from './useClientForm'
import { validateClientForm } from './validate'
import { ZIP_TABLE } from './zip'

/** 状態ごとの確かめ用の入力値（?state= で見せる物）。社名・人名・メールはすべて架空。 */
const withContact = (v: FormValues, c: Partial<FormValues['contacts'][number]>): FormValues => ({ ...v, contacts: [{ ...blankContact(), ...c }] })

/** 保存の途中・失敗の見本：必須が入った入力。 */
const filledClient = (blank: FormValues): FormValues =>
  withContact(
    { ...blank, name: '株式会社ノース商会', kana: 'ノースショウカイ', zip: '060-0042', address: '北海道札幌市中央区大通西', street: '5丁目8-3' },
    { name: '田中 太郎', email: 'tanaka@north-shokai.example.jp' },
  )

export function clientSeedFor(state: string, defaults: ClientTerms): Seed | undefined {
  const blank = blankClientValues(defaults)
  switch (state) {
    case 'invalid': {
      const values = withContact({ ...blank, zip: '060-00' }, { email: 'info@example' })
      return { values, errors: validateClientForm(values) }
    }
    case 'saving':
      return { saving: true, values: filledClient(blank) }
    case 'save_failed':
      return { saveFailed: true, values: filledClient(blank) }
    case 'confirming':
      return { values: { ...blank, name: '株式会社ノース商会' } }
    case 'zip_many':
      return { values: { ...blank, zip: '064-0941' }, zip: { kind: 'many', options: ZIP_TABLE['0640941'], chosen: null } }
    case 'zip_empty':
      return { values: { ...blank, zip: '060-9000' }, zip: { kind: 'empty' } }
    case 'zip_error':
      return { values: { ...blank, zip: '060-0042' }, zip: { kind: 'error' } }
    default:
      return undefined
  }
}
