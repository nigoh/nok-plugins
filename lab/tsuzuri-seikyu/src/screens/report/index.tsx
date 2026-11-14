import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../app/AppShell'
import { Link } from '../../app/Link'
import { LinkButton } from '../../app/LinkButton'
import { StaleNotice, RefreshingNote } from '../../app/StaleNotice'
import { paramNumber, replaceParams, useUrlParam } from '../../app/nav'
import { actions, messages, screenNames } from '../../app/terms'
import type { ScreenDef } from '../../app/types'
import { clients, invoices, TODAY, useFake } from '../../data'
import { Button, EmptyState, ErrorState, Field, Notice, Segmented, Skeleton, useToast } from '../../ui'
import { clientRows, monthlyFigures, topClients, topMonth, totalsOf, type MonthFigure } from './aggregate'
import { ClientBars } from './ClientBars'
import { ClientTable } from './ClientTable'
import { axisFor } from './chartScale'
import { buildCsv, csvFileName, downloadCsv } from './csv'
import { manySource, type Source } from './manySample'
import { MonthTable } from './MonthTable'
import { MonthlyChart } from './MonthlyChart'
import { DEFAULT_PERIOD, monthsOf, parsePeriod, periodCaption, PERIODS, rangeText, type Period } from './periods'
import { chartSummary, clientSummary, copy } from './copy'

const STATES = ['default', 'loading', 'error', 'empty', 'filtered_empty', 'many', 'partial', 'saving', 'refreshing', 'stale'] as const

/** partial で取れなかった月（見本）。 */
const FAILED_MONTHS = ['2026-08', '2026-09']
/** 書き出しの見せかけの待ち。 */
const EXPORT_MS = 400
/** 再読み込みの見せかけの待ち。 */
const RETRY_MS = 600

type Retry = 'idle' | 'busy' | 'done'

const axisOf = (figures: MonthFigure[]) =>
  axisFor(figures.flatMap((f) => [f.billed, f.paid]).filter((v): v is number => v !== null))

function ReportScreen({ state }: { state: string }) {
  const toast = useToast()
  const [periodRaw] = useUrlParam('period', DEFAULT_PERIOD)
  const [pageRaw, setPage] = useUrlParam('page', '1')
  const period = parsePeriod(periodRaw)
  const page = paramNumber(pageRaw)

  const fake = useFake(state === 'filtered_empty' ? 'default' : state, (s): Source => (s === 'many' ? manySource() : { invoices, clients }))
  const [retry, setRetry] = useState<Retry>('idle')
  const [exporting, setExporting] = useState(false)
  const [axisNote, setAxisNote] = useState<string | null>(null)

  const source = fake.kind === 'ready' || fake.kind === 'refreshing' || fake.kind === 'stale' ? fake.data : null
  const failed = state === 'partial' && retry !== 'done' ? FAILED_MONTHS : []
  const months = monthsOf(period, TODAY)

  const figures = useMemo(() => (source ? monthlyFigures(source.invoices, months, TODAY, failed) : []), [source, months.join(), failed.join()])
  const rows = useMemo(() => (source ? clientRows(source.invoices, source.clients, months, TODAY, failed) : []), [source, months.join(), failed.join()])
  const axis = axisOf(figures)
  const sum = totalsOf(figures)
  const nothing = source !== null && figures.every((f) => f.billed === 0 && f.paid === 0)
  const filteredEmpty = state === 'filtered_empty' || nothing

  // 書き出し：見せかけの待ちのあとで作って渡す。作れなければ失敗の知らせ（E-06）
  useEffect(() => {
    if (!exporting) return
    const t = window.setTimeout(() => {
      try {
        downloadCsv(csvFileName(months), buildCsv(figures, rows))
        toast.show({ message: copy.exported, tone: 'ok' })
      } catch {
        toast.show({ message: copy.exportFailed, tone: 'fail' })
      }
      setExporting(false)
    }, EXPORT_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exporting])

  // 取れなかった月の読み直し（見せかけ）
  useEffect(() => {
    if (retry !== 'busy') return
    const t = window.setTimeout(() => {
      setRetry('done')
      toast.show({ message: copy.recovered(FAILED_MONTHS.length), tone: 'ok' })
    }, RETRY_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry])

  const changePeriod = (next: Period) => {
    if (source) {
      const nextMonths = monthsOf(next, TODAY)
      const after = axisOf(monthlyFigures(source.invoices, nextMonths, TODAY, failed)).label
      setAxisNote(after !== axis.label ? copy.axisChanged(axis.label, after) : null)
    }
    replaceParams({ period: next === DEFAULT_PERIOD ? null : next, page: null })
  }

  const locked = fake.kind === 'refreshing'
  const busy = exporting || state === 'saving'
  const canExport = source !== null && fake.kind === 'ready' && !filteredEmpty
  const exportNoteId = 'report-export-note'
  /** 更新中の知らせ。押せない期間と書き出しが aria-describedby で指す。 */
  const lockNoteId = 'report-lock-note'
  const description = failed.length > 0 ? `${copy.exportScope}${copy.exportScopePartial}` : copy.exportScope

  const primary =
    fake.kind === 'empty' && fake.state === 'empty' ? (
      <LinkButton to="invoice-new" variant="primary">{actions.createInvoice}</LinkButton>
    ) : (
      <Button
        variant="primary" leading="download" busy={busy} busyLabel={copy.exportBusy}
        disabled={!canExport && !busy} aria-describedby={fake.kind === 'stale' ? exportNoteId : locked ? lockNoteId : undefined}
        onClick={() => setExporting(true)}
      >
        {actions.exportTable}
      </Button>
    )

  const range = rangeText(months)
  const top = topMonth(figures)
  const items = source ? topClients(rows, copy.otherLabel) : []
  const summary = chartSummary(range, sum.billed, sum.paid, sum.counted, months.length, top)
  const openKey = figures.find((f) => f.open)?.month ?? null
  const showPeriod = !(fake.kind === 'empty' && fake.state === 'empty')

  return (
    <AppShell
      data-scr="SCR-008" state={state} states={STATES} title={screenNames.report} current="report" kind="view"
      description={description} primary={primary}
    >
      {fake.kind === 'loading' && <Skeleton variant="block" label={copy.loading} className="h-64" />}
      {fake.kind === 'error' && <ErrorState title={copy.errorTitle} description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {fake.kind === 'empty' && fake.state === 'empty' && <EmptyState
          title={copy.emptyTitle}
          description={<>{copy.emptyBody}{copy.emptyBeforeLink}<Link to="invoice-new" inline>{actions.createInvoice}</Link>{copy.emptyAfterLink}</>}
        />}

      {showPeriod && fake.kind !== 'loading' && fake.kind !== 'error' && (
        <Field label={copy.periodLabel} group mark="none">
          {(c) => (
            <Segmented
              label={copy.periodLabel} value={period} onChange={(v) => changePeriod(v as Period)} disabled={locked}
              aria-describedby={locked ? lockNoteId : c['aria-describedby']}
              options={PERIODS.map((p) => ({ value: p.value, label: p.label }))}
            />
          )}
        </Field>
      )}

      {(source !== null || filteredEmpty) && fake.kind !== 'loading' && fake.kind !== 'error' && !(fake.kind === 'empty' && fake.state === 'empty') && (
        <div className="flex flex-col gap-8 md:gap-12" aria-busy={locked || undefined}>
          {fake.kind === 'stale' && (
            <StaleNotice asOf={fake.asOf} retry={fake.retry} retrying={fake.retrying}>
              <span id={exportNoteId}>{copy.staleNote}</span>
            </StaleNotice>
          )}
          {locked && <RefreshingNote id={lockNoteId}>{copy.refreshingLock}</RefreshingNote>}

          <section className="flex flex-col gap-4" aria-labelledby="report-monthly">
            <h2 id="report-monthly" className="text-title font-bold">{copy.monthlyHeading(filteredEmpty ? null : axis.unitLabel)}</h2>
            <p className="text-body text-muted">{periodCaption(period, months, TODAY)}</p>
            {failed.length > 0 && (
              <Notice
                tone="warn" title={copy.partialTitle}
                action={<Button busy={retry === 'busy'} busyLabel={messages.loading} onClick={() => setRetry('busy')}>{actions.retry}</Button>}
              >
                {copy.partialBody(failed)}
              </Notice>
            )}
            {filteredEmpty ? (
              <MonthlyChart figures={figures.length > 0 ? figures : monthlyFigures([], months, TODAY)} axis={axisFor([])} summary={copy.filteredTitle} bare>
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-large font-bold">{copy.filteredTitle}</p>
                  <p className="text-body text-muted">{copy.filteredBody(range, period !== 'year')}</p>
                  {period !== 'year' && <Button onClick={() => changePeriod('year')}>{copy.widenPeriod}</Button>}
                </div>
              </MonthlyChart>
            ) : (
              <>
                <p className="text-body">{summary}</p>
                <MonthlyChart figures={figures} axis={axis} summary={summary} />
                {axisNote !== null && <p role="status" className="text-body text-muted">{axisNote}</p>}
                <MonthTable figures={figures} />
                <p className="max-w-prose text-body text-muted">{copy.note(openKey)}</p>
              </>
            )}
          </section>

          {!filteredEmpty && items.length > 0 && (
            <section className="flex flex-col gap-4" aria-labelledby="report-clients">
              <h2 id="report-clients" className="text-title font-bold">{copy.clientsHeading}</h2>
              <p className="text-body text-muted">{periodCaption(period, months, TODAY)}</p>
              <p className="text-body">{clientSummary(items[0])}</p>
              <ClientBars label={copy.clientsHeading} items={items} />
              <ClientTable rows={rows} page={page} onPage={(p) => setPage(String(p))} disabled={locked} />
            </section>
          )}

          <nav aria-label="関連" className="flex flex-wrap gap-6">
            <Link to="invoices">{copy.linkInvoices}</Link>
            <Link to="clients">{copy.linkClients}</Link>
          </nav>
        </div>
      )}
    </AppShell>
  )
}

/** 状態が替わったら描き直す（書き出し・読み直しの途中経過を持ち越さない）。 */
function Report({ state }: { state: string }) {
  return <ReportScreen key={state} state={state} />
}

export const screen: ScreenDef = { id: 'SCR-008', slug: 'report', title: screenNames.report, kind: 'view', states: [...STATES], Component: Report }
