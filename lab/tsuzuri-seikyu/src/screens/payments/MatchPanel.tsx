import { useId, useState, type RefObject } from 'react'
import { actions } from '../../app/terms'
import { clientOf, formatDate, invoiceTotal, type Client, type Invoice } from '../../data'
import { Button, Card, Field, Icon, Money, Notice, Radio, RadioGroup, TextInput } from '../../ui'
import { DiffChoice } from './DiffChoice'
import { differenceOf, searchUnpaid, type Row } from './logic'
import { copy } from './copy'

/** 候補として見せる件数。探した結果として見せる件数。 */
const MAX_CANDIDATES = 3
const MAX_FOUND = 5

type Props = {
  row: Row
  /** 探す対象（未入金の請求書）。 */
  unpaid: Invoice[]
  clients: Client[]
  /** 選んでいる請求書の id。無ければ空。 */
  chosenId: string
  /** この入金の確認を処理している最中。 */
  busy: boolean
  /** この入金の確認の送信が失敗した（save_failed）。選んだ内容は残る。 */
  failed: boolean
  /** 更新中・古い内容・ほかを処理中。押せない理由は lockedReasonId の文が言う。 */
  locked: boolean
  lockedReasonId: string
  headingRef: RefObject<HTMLHeadingElement | null>
  onChoose: (invoiceId: string) => void
  onCancel: () => void
  onConfirm: (invoiceId: string) => void
}

/**
 * 開いた入金の突き合わせ。候補の請求書から選ぶ・請求書を探して選ぶ・差額があればその場で 2 択。
 * 持つ物は探す語だけ。確定は onConfirm で親に渡す（取得も確定も知らない）。入金ごとに key を替えて開く。
 */
export function MatchPanel({ row, unpaid, clients, chosenId, busy, failed, locked, lockedReasonId, headingRef, onChoose, onCancel, onConfirm }: Props) {
  const [query, setQuery] = useState('')
  const group = useId()
  const pickReasonId = useId()
  const { payment } = row

  const entries = [
    ...(row.matched && !row.cands.some((c) => c.invoice.id === row.matched?.invoice.id)
      ? [{ invoice: row.matched.invoice, clientName: row.matched.clientName, reason: '' }] : []),
    ...row.cands.map((c) => ({ invoice: c.invoice, clientName: c.clientName, reason: copy.reason(c) })),
  ].slice(0, MAX_CANDIDATES)
  const shownIds = new Set(entries.map((e) => e.invoice.id))
  const hits = query === '' && entries.length > 0 ? [] : searchUnpaid(query, unpaid, clients).filter((i) => !shownIds.has(i.id))
  const found = hits.slice(0, MAX_FOUND)

  const chosen = chosenId ? [...unpaid, ...(row.matched ? [row.matched.invoice] : [])].find((i) => i.id === chosenId) : undefined
  const diff = chosen ? differenceOf(payment, chosen) : 0
  const optionOf = (inv: Invoice, clientName: string, reason: string) => (
    <Radio
      key={inv.id} variant="card" name={group} value={inv.id} checked={inv.id === chosenId} onChange={onChoose} disabled={busy}
      label={`${inv.number ?? ''}　${clientName}`} description={copy.candidateMeta(invoiceTotal(inv), inv.dueOn)}
      note={[reason, copy.diffNote(differenceOf(payment, inv))].filter(Boolean).join('・')}
    />
  )
  const describedBy = !chosen ? pickReasonId : locked ? lockedReasonId : undefined

  return (
    <div id="payments-panel">
      <Card as="section">
        <div className="flex flex-col gap-4">
          <h3 ref={headingRef} tabIndex={-1} className="text-large font-bold">{copy.panelHeading}</h3>
          <dl className="flex flex-col gap-1 text-body">
            <div className="flex gap-4"><dt className="w-24 shrink-0 text-muted">{copy.panelDate}</dt><dd>{formatDate(payment.receivedOn)}</dd></div>
            <div className="flex gap-4"><dt className="w-24 shrink-0 text-muted">{copy.panelPayer}</dt><dd className="min-w-0">{payment.payerName}</dd></div>
            <div className="flex gap-4"><dt className="w-24 shrink-0 text-muted">{copy.panelAmount}</dt><dd><Money value={payment.amount} /></dd></div>
          </dl>

          {entries.length > 0 ? (
            <RadioGroup legend={<span className="font-bold">{copy.candidatesLegend}</span>} gap="sm">
              {entries.map((e) => optionOf(e.invoice, e.clientName, e.reason))}
            </RadioGroup>
          ) : (
            <p className="flex items-start gap-1 text-body"><Icon name="info" size="sm" className="mt-1" />{copy.noCandidates}</p>
          )}

          <Field label={copy.searchLabel} hint={copy.searchHint}>
            {(p) => <TextInput {...p} value={query} onChange={(e) => setQuery(e.target.value)} leading={<Icon name="search" size="sm" />} autoComplete="off" spellCheck={false} />}
          </Field>
          {found.length > 0 && (
            <RadioGroup legend={<span className="font-bold">{query === '' ? copy.unpaidLegend : copy.searchedLegend}</span>} gap="sm">
              {found.map((inv) => optionOf(inv, clientOf(inv.clientId, clients)?.name ?? '', ''))}
              {hits.length > found.length && <p className="text-body text-muted">{copy.searchMore(hits.length - found.length)}</p>}
            </RadioGroup>
          )}
          {query !== '' && hits.length === 0 && <p role="status" className="text-body text-muted">{copy.searchNone(query)}</p>}

          {failed && <Notice tone="fail">{copy.confirmFailed}</Notice>}
          {chosen && diff !== 0 ? (
            <DiffChoice
              amount={payment.amount} total={invoiceTotal(chosen)} diff={diff} busy={busy} locked={locked} lockedReasonId={lockedReasonId}
              onBack={onCancel} onFee={() => onConfirm(chosen.id)}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {!chosen && <p id={pickReasonId} className="text-body text-muted">{copy.pickToConfirm}</p>}
              <div className="flex flex-col gap-2 md:flex-row md:justify-end">
                <Button onClick={onCancel} disabled={busy}>{actions.cancel}</Button>
                <Button busy={busy} busyLabel={copy.confirmBusy} disabled={!chosen || locked} aria-describedby={describedBy} onClick={() => chosen && onConfirm(chosen.id)}>
                  {copy.confirmOne}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
