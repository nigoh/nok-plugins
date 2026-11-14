import { useMemo } from 'react'
import { AppShell } from '../../app/AppShell'
import { LinkButton } from '../../app/LinkButton'
import { useRoute } from '../../app/nav'
import { screenNames } from '../../app/terms'
import type { ScreenDef } from '../../app/types'
import { displayStatus, outcomeOf, TODAY, useFake } from '../../data'
import { invoiceStatusDef } from '../../parts'
import { Button, EmptyState, ErrorState, Notice, Skeleton, Stepper } from '../../ui'
import { ConfirmDialog } from './ConfirmDialog'
import { page } from './copy'
import { HistorySection } from './HistorySection'
import { LinesSection } from './LinesSection'
import { makeService, type Service } from './operations'
import { OtherActions } from './OtherActions'
import { Overview } from './Overview'
import { RecordDialog } from './RecordDialog'
import { resolveInvoice } from './samples'
import { planOf, primaryLabel } from './statusActions'
import { useInvoiceOps } from './useInvoiceOps'
import { invoiceFlow } from '../../parts'

const STATES = ['default', 'status_draft', 'status_overdue', 'status_paid', 'status_void', 'saving', 'save_failed', 'confirming', 'invalid', 'many', 'loading', 'error', 'not_found'] as const

/** 請求書の詳細。1 通を見て、次の操作（送る・入金を記録する・取り消す）に進む。service は通信（見本では偽物。?state=save_failed なら操作が失敗する）。 */
export function InvoiceDetail({ state, service }: { state: string; service?: Service }) {
  const fallback = useMemo(() => makeService(outcomeOf(state) === 'failed' ? 'failed' : 'ok'), [state])
  const id = useRoute().params.get('id')
  const fake = useFake(state, (s) => resolveInvoice(s, id), page.loadFailed)
  const base = fake.kind === 'ready' ? fake.data : null
  const ops = useInvoiceOps(base, state, service ?? fallback)
  const invoice = ops.invoice
  const status = invoice ? displayStatus(invoice, TODAY) : null
  const plan = status ? planOf[status] : null
  const primary = plan?.primary
    ? <Button variant="primary" onClick={() => plan.primary && ops.open(plan.primary)}>{primaryLabel[plan.primary]}</Button>
    : undefined

  return (
    <AppShell
      data-scr="SCR-004" state={state} states={STATES} title={screenNames['invoice-detail']} current="invoices" kind="view"
      back={{ to: 'invoices', label: screenNames.invoices }}
      description={invoice ? (invoice.number ?? page.noNumber) : undefined}
      primary={primary}
    >
      {fake.kind === 'loading' && (
        <div className="flex flex-col gap-8">
          <Skeleton lines={4} />
          <div aria-hidden="true"><Skeleton variant="block" label="" className="h-24" /></div>
          <div aria-hidden="true"><Skeleton lines={5} label="" /></div>
        </div>
      )}
      {fake.kind === 'error' && <ErrorState title={page.loadFailedTitle} description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {fake.kind === 'ready' && !invoice && (
        <EmptyState
          title={page.notFoundTitle}
          description={page.notFound}
          action={<LinkButton to="invoices">{page.toList}</LinkButton>}
        />
      )}
      {invoice && status && plan && (
        <>
          {status === 'void' && <Notice tone="info">{page.voidNotice}</Notice>}
          <Overview invoice={invoice} />
          {plan.step !== null && (
            <Stepper label={page.flow} steps={invoiceFlow.map((s) => invoiceStatusDef[s].label)} current={plan.step} />
          )}
          <LinesSection invoice={invoice} />
          <HistorySection rows={ops.rows} freshId={ops.freshId} />
          <OtherActions plan={plan} invoice={invoice} pending={ops.pending} failure={ops.failure} onOpen={ops.open} onUnrecord={ops.undo} />
          <ConfirmDialog
            op={ops.openOp}
            invoice={invoice}
            pending={ops.pending === ops.openOp}
            failure={ops.failure}
            onConfirm={() => { if (ops.openOp && ops.openOp !== 'record') void ops.run({ op: ops.openOp }) }}
            onClose={ops.close}
          />
          <RecordDialog
            open={ops.openOp === 'record'}
            invoice={invoice}
            state={state}
            pending={ops.pending === 'record'}
            failure={ops.failure}
            onSubmit={(input) => void ops.run({ op: 'record', input })}
            onClose={ops.close}
          />
        </>
      )}
    </AppShell>
  )
}

/** 状態や対象（?id=）が変わったら、操作の状態を作り直す。 */
function Screen({ state }: { state: string }) {
  const id = useRoute().params.get('id') ?? ''
  return <InvoiceDetail key={`${state}:${id}`} state={state} />
}

export const screen: ScreenDef = { id: 'SCR-004', slug: 'invoice-detail', title: screenNames['invoice-detail'], kind: 'view', states: [...STATES], Component: Screen }
