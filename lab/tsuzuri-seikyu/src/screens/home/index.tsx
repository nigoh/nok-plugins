import { AppShell } from '../../app/AppShell'
import { Link } from '../../app/Link'
import { LinkButton } from '../../app/LinkButton'
import { actions, screenNames } from '../../app/terms'
import type { ScreenDef } from '../../app/types'
import { useFake } from '../../data'
import { EmptyState, ErrorState } from '../../ui'
import { copy } from './copy'
import { HomeBody } from './HomeBody'
import { HomeSkeleton } from './HomeSkeleton'
import { homeSample } from './sampleVariants'

const STATES = ['default', 'loading', 'error', 'empty', 'todo_empty', 'many'] as const

/**
 * SCR-001 ホーム。取得の結果（loading・empty・error・ready）で本体を描き分ける。
 * 見出し（h1）と主ボタンは、どの状態でも同じ位置に残す（取得に失敗しても「請求書を作る」は押せる）。
 */
function Home({ state }: { state: string }) {
  const fake = useFake(state, homeSample, copy.error)
  return (
    <AppShell
      data-scr="SCR-001" state={state} states={STATES} title={screenNames.home} current="home" kind="view"
      primary={<LinkButton to="invoice-new" variant="primary">{actions.createInvoice}</LinkButton>}
    >
      {fake.kind === 'loading' && <HomeSkeleton />}
      {fake.kind === 'error' && <ErrorState description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {fake.kind === 'empty' && (
        <EmptyState
          title={copy.empty.title}
          description={copy.empty.description}
          action={<p className="text-body">{copy.empty.setupLead}<Link to="setup" inline>{screenNames.setup}</Link><span className="inline-block">{copy.empty.setupTail}</span></p>}
        />
      )}
      {(fake.kind === 'ready' || fake.kind === 'refreshing' || fake.kind === 'stale') && <HomeBody data={fake.data} />}
    </AppShell>
  )
}

export const screen: ScreenDef = { id: 'SCR-001', slug: 'home', title: screenNames.home, kind: 'view', states: [...STATES], Component: Home }
