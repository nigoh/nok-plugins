import { useMemo } from 'react'
import { AppShell } from '../../app/AppShell'
import { LinkButton } from '../../app/LinkButton'
import { Link } from '../../app/Link'
import { RefreshingNote, StaleNotice } from '../../app/StaleNotice'
import { actions, screenNames } from '../../app/terms'
import type { ScreenDef } from '../../app/types'
import { clients, formatNumber, invoices, manyInvoices, useFake } from '../../data'
import { paginate } from '../../lib'
import { Button, EmptyState, ErrorState, Pagination, Skeleton } from '../../ui'
import { AppliedConditions } from './AppliedConditions'
import { copy } from './copy'
import { InvoiceTable } from './InvoiceTable'
import { InvoiceToolbar } from './InvoiceToolbar'
import { buildInvoiceRows, countByStatus, selectRows, SORTS } from './query'
import { useInvoiceQuery } from './useInvoiceQuery'

const STATES = ['default', 'loading', 'error', 'empty', 'filtered_empty', 'many', 'refreshing', 'stale'] as const

/**
 * 見本の「条件に合う請求書が 0 件」。URL に条件が無いときだけ、最初にこの条件を入れる。
 * 取り消し済みの「北斗」の請求書は見本に無いので、本物の絞り込みの結果として 0 件になる。
 */
const FILTERED_EMPTY_SEED = { status: 'void', q: '北斗' } as const

function Invoices({ state }: { state: string }) {
  // filtered_empty は専用の取得を持たず、条件を入れた本物の絞り込みで 0 件にする（条件を外すと一覧に戻れる）
  const fake = useFake(
    state === 'filtered_empty' ? 'default' : state,
    (s) => (s === 'many' ? manyInvoices() : invoices),
    copy.loadFailed,
  )
  const { query, update, clear } = useInvoiceQuery(state === 'filtered_empty' ? FILTERED_EMPTY_SEED : undefined)

  const source = fake.kind === 'ready' || fake.kind === 'refreshing' || fake.kind === 'stale' ? fake.data : null
  const all = useMemo(() => (source ? buildInvoiceRows(source, clients) : []), [source])
  const counts = useMemo(() => countByStatus(all), [all])
  const matched = useMemo(() => selectRows(all, query), [all, query])
  const paged = paginate(matched, query.page)
  const refreshing = fake.kind === 'refreshing'

  return (
    <AppShell
      data-scr="SCR-002" state={state} states={STATES} title={screenNames.invoices} current="invoices" kind="view"
      primary={<LinkButton to="invoice-new" variant="primary">{actions.createInvoice}</LinkButton>}
    >
      {fake.kind === 'loading' && <Skeleton lines={8} />}
      {fake.kind === 'error' && <ErrorState description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {fake.kind === 'empty' && (
        <EmptyState
          title={copy.empty.title}
          description={<><Link to="invoice-new" inline>{copy.empty.link}</Link>{copy.empty.afterLink}</>}
        />
      )}
      {source && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <InvoiceToolbar query={query} counts={counts} onChange={update} sortLocked={refreshing} />
            <AppliedConditions
              query={query}
              onClearStatus={() => update({ status: 'all' })}
              onClearQuery={() => update({ q: '' })}
              onClearAll={clear}
            />
          </div>
          {fake.kind === 'stale' && <StaleNotice asOf={fake.asOf} retry={fake.retry} retrying={fake.retrying} />}
          {refreshing && <RefreshingNote>{copy.refreshingLock}</RefreshingNote>}
          {matched.length === 0 ? (
            <EmptyState
              title={copy.filteredEmpty.title}
              description={copy.filteredEmpty.description}
              action={<Button onClick={clear}>{copy.clearAll}</Button>}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <p aria-live="polite" className="text-body text-muted">{copy.count(formatNumber(matched.length), SORTS[query.sort].note)}</p>
              <InvoiceTable rows={paged.rows} />
              {paged.paged && <Pagination page={paged.page} total={paged.total} disabled={refreshing} onChange={(page) => update({ page })} />}
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}

export const screen: ScreenDef = { id: 'SCR-002', slug: 'invoices', title: screenNames.invoices, kind: 'view', states: [...STATES], Component: Invoices }
