import { useEffect, useRef } from 'react'
import { AppShell } from '../../app/AppShell'
import { LinkButton } from '../../app/LinkButton'
import { paramNumber, useUrlParam } from '../../app/nav'
import { RefreshingNote, StaleNotice } from '../../app/StaleNotice'
import { screenNames } from '../../app/terms'
import type { ScreenDef } from '../../app/types'
import { clients, useFake } from '../../data'
import { paginate } from '../../lib'
import { paymentStatusDef, tagDensityOf } from '../../parts'
import { Button, EmptyState, ErrorState, Pagination, Skeleton } from '../../ui'
import { BulkConfirmDialog } from './BulkConfirmDialog'
import { ConfirmedTable } from './ConfirmedTable'
import { makePaymentsData, openedBy, type PaymentsData } from './fixtures'
import { sumAmount } from './logic'
import { MatchPanel } from './MatchPanel'
import { ResultNotice } from './ResultNotice'
import { UnconfirmedTable } from './UnconfirmedTable'
import { useReconcile } from './useReconcile'
import { copy } from './copy'

const STATES = ['default', 'loading', 'error', 'empty', 'many', 'candidates_empty', 'status_diff', 'confirming', 'partial', 'saving', 'save_failed', 'refreshing', 'stale'] as const

/** 確認済みの表に出す件数の上限。 */
const CONFIRMED_MAX = 10
/** 押せない理由の文の id（更新中・古い内容）。押せない操作の aria-describedby が指す。 */
const LOCK_ID = 'payments-lock-reason'
const SELECTION_ID = 'payments-selection'

const NO_DATA: PaymentsData = { payments: [], invoices: [] }

function PaymentsScreenBody({ state }: { state: string }) {
  const fake = useFake(state, makePaymentsData)
  const hasData = fake.kind === 'ready' || fake.kind === 'refreshing' || fake.kind === 'stale'
  const data = hasData ? fake.data : NO_DATA
  const locked = fake.kind === 'refreshing' || fake.kind === 'stale'
  const rec = useReconcile({ data, state, locked })

  const [payParam, setPay] = useUrlParam('pay')
  const [pageParam, setPage] = useUrlParam('page', '1')
  useEffect(() => {
    const first = openedBy(state)
    if (first && payParam === '') setPay(first)
    // 開いたときの 1 回だけ（状態名で最初に開いておく入金を URL に置く）
  }, [])

  const openRow = rec.unconfirmed.find((r) => r.payment.id === payParam) ?? null
  const panelHeading = useRef<HTMLHeadingElement>(null)
  const listHeading = useRef<HTMLHeadingElement>(null)
  const focusPanel = useRef(false)
  const focusList = useRef(false)
  useEffect(() => {
    if (openRow && focusPanel.current) { panelHeading.current?.focus(); focusPanel.current = false }
    if (!openRow && focusList.current) { listHeading.current?.focus(); focusList.current = false }
  }, [openRow])
  const open = (id: string) => { focusPanel.current = true; setPay(id) }
  const close = () => { focusList.current = true; setPay(null) }

  const paged = paginate(rec.unconfirmed, paramNumber(pageParam))
  const pageRows = paged.rows
  const shownConfirmed = rec.confirmed.slice(0, CONFIRMED_MAX)
  const density = tagDensityOf([...pageRows, ...shownConfirmed].map((r) => paymentStatusDef[r.status].tone))
  const oldest = rec.unconfirmed.reduce((min, r) => (r.payment.receivedOn < min ? r.payment.receivedOn : min), rec.unconfirmed[0]?.payment.receivedOn ?? '')
  const canBulk = hasData && rec.unconfirmed.some((r) => r.sure)
  const names = Object.fromEntries(rec.rows.map((r) => [r.payment.id, r.payment.payerName]))

  const primary = fake.kind === 'loading'
    ? <Button variant="primary" disabled>{copy.confirmAll}</Button>
    : canBulk
      ? (
        <Button variant="primary" disabled={locked || rec.checked.length === 0 || rec.busy !== null} aria-describedby={locked ? LOCK_ID : SELECTION_ID} onClick={rec.openWindow}>
          {copy.confirmAll}
        </Button>
      )
      : undefined

  return (
    <AppShell data-scr="SCR-007" state={state} states={STATES} title={screenNames.payments} current="payments" kind="view" primary={primary}>
      {fake.kind === 'loading' && (
        <section className="flex flex-col gap-4">
          <h2 className="text-large font-bold">{copy.unconfirmedHeading}</h2>
          <Skeleton lines={6} label={copy.loading} />
        </section>
      )}
      {fake.kind === 'error' && <ErrorState title={copy.loadFailed} description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {fake.kind === 'empty' && (
        <EmptyState
          title={copy.allDoneTitle} description={copy.allDoneBody} icon="circle-check"
          action={<LinkButton to="home">{screenNames.home}を見る</LinkButton>}
        />
      )}
      {hasData && (
        <>
          {fake.kind === 'stale' && (
            <div id={LOCK_ID}>
              <StaleNotice asOf={fake.asOf} retry={fake.retry} retrying={fake.retrying}>{copy.lockStale}</StaleNotice>
            </div>
          )}
          {fake.kind === 'refreshing' && <RefreshingNote id={LOCK_ID}>{copy.lockRefreshing}</RefreshingNote>}
          {rec.result && (
            <ResultNotice result={rec.result} names={names} failures={rec.failures} busy={rec.busy === 'retry'} locked={locked || (rec.busy !== null && rec.busy !== 'retry')} retryFailed={rec.failedAt === 'retry'} onRetry={rec.retryFailed} />
          )}
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 ref={listHeading} tabIndex={-1} className="text-large font-bold">{copy.unconfirmedHeading}</h2>
              {rec.unconfirmed.length > 0 && <p className="text-body text-muted">{copy.summary(rec.unconfirmed.length, sumAmount(rec.unconfirmed), oldest)}</p>}
              {canBulk && (
                <p id={SELECTION_ID} role="status" className="text-body text-muted">
                  {rec.checked.length > 0 ? copy.selected(rec.checked.length, rec.checkedTotal) : copy.selectNone}
                </p>
              )}
            </div>
            {rec.unconfirmed.length === 0 ? (
              <EmptyState
                title={copy.allDoneTitle} description={copy.allDoneBody} icon="circle-check"
                action={<LinkButton to="home">{screenNames.home}を見る</LinkButton>}
              />
            ) : (
              <>
                {openRow && (
                  <MatchPanel
                    key={openRow.payment.id} row={openRow} unpaid={rec.unpaid} clients={clients} chosenId={rec.choiceOf(openRow)}
                    busy={rec.busy === openRow.payment.id} failed={rec.failedAt === openRow.payment.id} locked={locked || (rec.busy !== null && rec.busy !== openRow.payment.id)}
                    lockedReasonId={LOCK_ID} headingRef={panelHeading}
                    onChoose={(id) => rec.choose(openRow.payment.id, id)}
                    onCancel={() => { rec.clearChoice(openRow.payment.id); close() }}
                    onConfirm={(id) => rec.confirmOne(openRow, id, close)}
                  />
                )}
                <UnconfirmedTable
                  rows={pageRows} density={density} checkedIds={new Set(rec.checked.map((r) => r.payment.id))} openId={openRow?.payment.id ?? null}
                  busy={rec.busy} locked={locked} lockedReasonId={LOCK_ID} failures={rec.failures} failedId={rec.failedAt}
                  onToggle={rec.toggle} onOpen={open} onConfirm={(r) => rec.confirmOne(r, r.sure?.invoice.id ?? '')}
                />
                {paged.paged && <Pagination page={paged.page} total={paged.total} onChange={(p) => setPage(String(p))} />}
              </>
            )}
          </section>
          {shownConfirmed.length > 0 && (
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-large font-bold">{copy.confirmedHeading}</h2>
                {rec.confirmed.length > CONFIRMED_MAX && <p className="text-body text-muted">{copy.confirmedCap(CONFIRMED_MAX)}</p>}
              </div>
              <ConfirmedTable rows={shownConfirmed} density={density} fees={rec.fees} />
            </section>
          )}
          <BulkConfirmDialog open={rec.windowOpen} rows={rec.checked} busy={rec.busy === 'bulk'} failed={rec.failedAt === 'bulk'} onClose={rec.closeWindow} onConfirm={rec.confirmChecked} />
        </>
      )}
    </AppShell>
  )
}

/** 状態が替わったら最初から作り直す（窓の開閉・選んだ物は状態ごとの初期値から始める）。 */
function Payments({ state }: { state: string }) {
  return <PaymentsScreenBody key={state} state={state} />
}

export const screen: ScreenDef = { id: 'SCR-007', slug: 'payments', title: screenNames.payments, kind: 'view', states: [...STATES], Component: Payments }
