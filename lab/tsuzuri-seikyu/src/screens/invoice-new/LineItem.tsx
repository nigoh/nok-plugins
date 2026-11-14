import { messages } from '../../app/terms'
import { Button, Field, Money, Segmented, TextInput } from '../../ui'
import { copy } from './copy'
import { isRequired, lineIds, markOf } from './fields'
import type { LineDraft } from './types'

type Props = {
  /** 何行目か（1 から）。見出し・読み上げ名に入る。 */
  n: number
  line: LineDraft
  amount: number | null
  errors: { desc?: string; qty?: string; price?: string }
  adjusted: { qty: boolean; price: boolean }
  canRemove: boolean
  onChange: (key: keyof LineDraft, value: string) => void
  onBlur: (key: 'qty' | 'price') => void
  onRemove: () => void
}

/** 明細 1 行。知っているのはこの行の欄と金額の表示だけ（合計も階層も知らない）。枠の幅で並びが変わる（コンテナクエリ）。 */
export function LineItem({ n, line, amount, errors, adjusted, canRemove, onChange, onBlur, onRemove }: Props) {
  const f = lineIds(line.id)
  const name = copy.lineName(n)
  return (
    <li>
      <div role="group" aria-label={name} className="@container flex flex-col gap-4 border-t border-line pt-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-large font-bold">{name}</h3>
          {canRemove && <Button variant="quiet" onClick={onRemove}>{copy.removeLine(name)}</Button>}
        </div>
        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-3">
          <Field className="@xl:col-span-3" id={f.desc} label={copy.label.desc} required={isRequired('desc')} mark={markOf('desc')} error={errors.desc}>
            {(p) => <TextInput {...p} type="text" value={line.desc} onChange={(e) => onChange('desc', e.target.value)} spellCheck={false} />}
          </Field>
          <Field id={f.qty} label={copy.label.qty} required={isRequired('qty')} mark={markOf('qty')} error={errors.qty}>
            {(p) => (
              <>
                <TextInput {...p} type="text" inputMode="decimal" align="end" value={line.qty} onChange={(e) => onChange('qty', e.target.value)} onBlur={() => onBlur('qty')} />
                {adjusted.qty && <p role="status" className="text-body text-muted">{messages.widened}</p>}
              </>
            )}
          </Field>
          <Field id={f.unit} label={copy.label.unit} mark={markOf('unit')}>
            {(p) => <TextInput {...p} type="text" maxLength={8} value={line.unit} onChange={(e) => onChange('unit', e.target.value)} />}
          </Field>
          <Field id={f.price} label={copy.label.price} required={isRequired('price')} mark={markOf('price')} error={errors.price}>
            {(p) => (
              <>
                <TextInput {...p} type="text" inputMode="numeric" align="end" trailing="円" value={line.price} onChange={(e) => onChange('price', e.target.value)} onBlur={() => onBlur('price')} />
                {adjusted.price && <p role="status" className="text-body text-muted">{messages.widened}</p>}
              </>
            )}
          </Field>
          <Field group label={copy.label.tax} mark="none" className="@xl:col-span-2">
            {() => (
              <Segmented
                label={copy.lineTax(name)}
                value={String(line.tax)}
                onChange={(v) => onChange('tax', v)}
                options={[{ value: '10', label: '10%' }, { value: '8', label: '8%' }]}
              />
            )}
          </Field>
          <div className="flex flex-col gap-2 @xl:col-start-3">
            <p className="font-bold">{copy.label.amount}</p>
            <Money value={amount} size="large" />
          </div>
        </div>
      </div>
    </li>
  )
}
