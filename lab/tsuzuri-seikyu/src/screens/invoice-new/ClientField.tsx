import { describeTerms, type Client } from '../../data'
import { Link } from '../../app/Link'
import { actions, screenNames } from '../../app/terms'
import { foldForSearch } from '../../lib'
import { Field, Select, TextInput, type FieldMark } from '../../ui'
import { copy } from './copy'
import { ids } from './fields'

/** 取引先がこの数を超えたら、選ぶ前に絞る欄を足す（P-2：15 件以下は Select だけ）。 */
const FILTER_FROM = 16

type Props = {
  clients: Client[]
  value: string
  mark: FieldMark
  error?: string
  filter: string
  onFilter: (text: string) => void
  onChange: (id: string) => void
}

/** 取引先を選ぶ。知っているのは絞る語と選んだ id だけ（支払期限の計算は知らない）。 */
export function ClientField({ clients, value, mark, error, filter, onFilter, onChange }: Props) {
  const withFilter = clients.length >= FILTER_FROM
  const key = foldForSearch(filter)
  const shown = clients.filter((c) => key === '' || foldForSearch(c.name).includes(key) || foldForSearch(c.kana).includes(key) || c.id === value)
  const selected = clients.find((c) => c.id === value)
  const none = withFilter && key !== '' && shown.every((c) => c.id === value) && !clients.some((c) => foldForSearch(c.name).includes(key) || foldForSearch(c.kana).includes(key))
  return (
    <div className="flex flex-col gap-4">
      {withFilter && (
        <Field id={`${ids.client}-filter`} label={copy.label.filter} mark="none" hint={copy.hint.filter}>
          {(p) => <TextInput {...p} type="text" value={filter} onChange={(e) => onFilter(e.target.value)} autoComplete="off" />}
        </Field>
      )}
      {none && <p role="status" className="text-body text-muted">{copy.noClientMatch(filter)}</p>}
      <Field id={ids.client} label={screenNames.clients} required mark={mark} error={error}>
        {(p) => (
          <>
            <Select {...p} value={value} onChange={(e) => onChange(e.target.value)} placeholder={copy.select} options={shown.map((c) => ({ value: c.id, label: c.name }))} />
            {selected && (
              <p className="text-body">
                {selected.name}
                <span className="block text-muted">{describeTerms(selected.terms)}</span>
              </p>
            )}
          </>
        )}
      </Field>
      <p className="text-body">
        {copy.clientMissing}<Link to="client-form" inline>{actions.createClient}</Link>
      </p>
    </div>
  )
}
