import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../app/AppShell'
import { Link } from '../../app/Link'
import { LinkButton } from '../../app/LinkButton'
import { paramNumber, replaceParams, useUrlParam } from '../../app/nav'
import { RefreshingNote, StaleNotice } from '../../app/StaleNotice'
import { actions, screenNames } from '../../app/terms'
import type { ScreenDef } from '../../app/types'
import { clients, invoices, useFake } from '../../data'
import { paginate } from '../../lib'
import { Button, EmptyState, ErrorState, Pagination, Skeleton } from '../../ui'
import { ClientsTable } from './ClientsTable'
import { copy, filteredEmptyDescription, summary } from './copy'
import { makeManyRows } from './fixtures'
import { ListControls } from './ListControls'
import { arrange, DEFAULT_SORT, isSortKey, rowsFrom, sortLabel, sumUnpaid } from './model'

const STATES = ['default', 'loading', 'error', 'empty', 'filtered_empty', 'many', 'refreshing', 'stale'] as const

/** 「条件に合う物が無い」状態を開いたときに探す欄へ入れておく語（どの取引先名にも読み仮名にも当たらない）。 */
const SEED_QUERY = 'ゆきぞら'

function ClientsScreen({ state }: { state: string }) {
  // filtered_empty は取得の結果でなく、探す語の結果。取得は default と同じで、探す欄に語を入れて開く（5 を参照）
  const fake = useFake(state === 'filtered_empty' ? 'default' : state, (s) => (s === 'many' ? makeManyRows() : rowsFrom(clients, invoices)))
  // 探す語・並び順・ページは URL に持つ（REQ-027）。条件を変えたらページは 1 に戻す（page を外す）。既定の値は URL に書かない
  const [urlQ] = useUrlParam('q')
  const [urlSort] = useUrlParam('sort', DEFAULT_SORT)
  const [urlPage, setPage] = useUrlParam('page', '1')
  // filtered_empty だけ、URL に語が無いとき最初の語を見せる。語を変えたら見本の語は使わない
  const [seeded, setSeeded] = useState(state === 'filtered_empty')
  const q = urlQ !== '' ? urlQ : seeded ? SEED_QUERY : ''
  const sort = isSortKey(urlSort) ? urlSort : DEFAULT_SORT
  const setQuery = (next: string) => { setSeeded(false); replaceParams({ q: next, page: null }) }
  const setSort = (next: typeof sort) => replaceParams({ sort: next === DEFAULT_SORT ? null : next, page: null })
  const summaryRef = useRef<HTMLParagraphElement>(null)
  const movePage = useRef(false)

  const data = fake.kind === 'ready' || fake.kind === 'refreshing' || fake.kind === 'stale' ? fake.data : null
  const matched = data ? arrange(data, q, sort) : []
  const paged = paginate(matched, paramNumber(urlPage))
  const locked = fake.kind === 'refreshing'

  // ページ送りを押したあとだけ、新しいページの先頭へ（次へを押した位置のままだと新しいページの終わりを見てしまう。フォーカスも移す）。
  // 探す語を変えてページが 1 に戻ったときは移さない（打っている欄からフォーカスを奪わない）
  useEffect(() => {
    if (!movePage.current) return
    movePage.current = false
    summaryRef.current?.focus({ preventScroll: true })
    summaryRef.current?.scrollIntoView?.({ block: 'start' })
  }, [paged.page])

  return (
    <AppShell
      data-scr="SCR-005" state={state} states={STATES} title={screenNames.clients} current="clients" kind="view"
      primary={<LinkButton to="client-form" variant="primary">{actions.createClient}</LinkButton>}
    >
      {fake.kind === 'loading' && <Skeleton lines={8} label={copy.loading} />}
      {fake.kind === 'error' && <ErrorState description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {fake.kind === 'empty' && (
        <EmptyState
          title={copy.empty.title}
          description={<><Link to="client-form" inline>{actions.createClient}</Link>{copy.empty.afterLink}</>}
        />
      )}
      {data && (
        <div className="flex flex-col gap-4 md:gap-6">
          {fake.kind === 'stale' && <StaleNotice asOf={fake.asOf} retry={fake.retry} retrying={fake.retrying}>{copy.staleBody}</StaleNotice>}
          {locked && <RefreshingNote>{copy.refreshingLock}</RefreshingNote>}
          <ListControls q={q} sort={sort} locked={locked} onQuery={setQuery} onSort={setSort} />
          {matched.length === 0 ? (
            <EmptyState
              title={copy.filteredEmpty.title}
              description={filteredEmptyDescription(q)}
              action={<Button onClick={() => setQuery('')}>{copy.clearQuery}</Button>}
            />
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <p ref={summaryRef} tabIndex={-1} role="status" className="text-body outline-none">
                  {summary({ count: matched.length, filtered: q.trim() !== '', sortLabel: sortLabel(sort), unpaidTotal: sumUnpaid(matched) })}
                </p>
                <ClientsTable rows={paged.rows} />
              </div>
              {paged.paged && (
                <Pagination page={paged.page} total={paged.total} disabled={locked} onChange={(page) => { movePage.current = true; setPage(String(page)) }} />
              )}
            </>
          )}
        </div>
      )}
    </AppShell>
  )
}

/** 状態が替わったら描き直す（探す欄の最初の語・ページが状態に合う）。 */
function Clients({ state }: { state: string }) {
  return <ClientsScreen key={state} state={state} />
}

export const screen: ScreenDef = { id: 'SCR-005', slug: 'clients', title: screenNames.clients, kind: 'view', states: [...STATES], Component: Clients }
