import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, cn, Dialog, Icon, PageHeader } from '../ui'
import { LeaveDialog } from './LeaveDialog'
import { Link } from './Link'
import { navItems, screenNames, appName, type NavKey } from './terms'
import type { ScreenKind } from './types'
import { useLeaveGuard, type Proceed } from './useLeaveGuard'
import { useMedia } from './useMedia'

type Props = {
  /** 画面の SCR-ID。screens.yaml と同じ値を、文字そのままで data-scr に書く（例：SCR の番号）。 */
  'data-scr': string
  /** この画面の状態（?state= の値）と、画面が持つ状態の一覧。画面ファイルの STATES を渡す。 */
  state: string
  states: readonly string[]
  /** h1 と、タブの題名（「請求書の詳細 | つづり請求」）に使う。 */
  title: string
  /** 上のメニューのどの項目の下にある画面か。メニューに無い画面（はじめての設定）は null。 */
  current: NavKey | null
  /**
   * 画面の種類（screens.yaml の kind と同じ値）。主操作の置き場所が決まる（form.md F-10）。
   * view＝見る画面・一覧：768px 以上は見出しの右。form＝入力画面：768px 以上は入力の末尾の右。
   * どちらも 768px 未満は下に固定。順は「やめる」→主。
   */
  kind: ScreenKind
  /** 主ボタン。1 画面に 1 つ。置き場所は kind で決まる。入力画面では type=submit と form 属性で form に結ぶ。 */
  primary?: ReactNode
  /**
   * 主の隣に置く副の操作（「下書きを保存する」「やめる」など）。DOM でも見た目でも主の左（やめる→主）。
   * 2 つまで置ける：[やめる, 下書きを保存する] の配列で渡す。下に固定する帯では副が上の段に 2 つ並び、主が下の段いっぱいになる。
   * 状態ごとに主・副を替えるときは、状態ごとに別の枠を作らず、ここに渡す物を状態で替える（読み込み中だけ別の枠にしない）。
   */
  secondary?: ReactNode | readonly [ReactNode, ReactNode]
  /**
   * 未保存の変更があるか。true の間、メニュー・戻りのリンク・ブラウザの戻るで離れようとすると、骨格が「離れる窓」を出す（F-09）。
   * 画面は dirty を渡すだけ。保存中・保存し終わった直後は false にする。
   */
  dirty?: boolean
  /**
   * 離れる窓の「保存して離れる」で呼ぶ関数。保存できたら true を返す（false なら離れず、窓を閉じて画面の誤りを見せる）。
   * 渡さないと、窓に「保存して離れる」は出ず、主は「入力に戻る」になる。
   */
  onSaveBeforeLeave?: () => boolean | Promise<boolean>
  description?: ReactNode
  /** 左上の戻り。行き先の画面の slug と、その呼び名。 */
  back?: { to: string; label: string; params?: Record<string, string> }
  /** 中身の幅。forms=読みやすい幅（フォーム）、wide=一覧や図。 */
  width?: 'form' | 'wide'
  children: ReactNode
}

function NavList({ current }: { current: NavKey | null }) {
  return (
    <nav aria-label="主なメニュー">
      <ul className="flex flex-col gap-1">
        {navItems.map((n) => (
          <li key={n.key}>
            <Link
              to={n.slug}
              bare
              aria-current={n.key === current ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center rounded-control border px-3 text-body transition-colors duration-(--dur-instant)',
                n.key === current ? 'border-ai bg-ai-soft font-bold text-ai-text' : 'border-transparent text-fg hover:bg-col',
              )}
            >
              {screenNames[n.slug]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * CMP-020。全画面共通の骨格。<main> はここだけが持つ。画面は title・主操作・中身を渡すだけ。
 * 1024px 以上は左にメニュー、未満は上の帯の「メニュー」から出す。主操作は kind で置き場所が決まる（見る画面は見出しの右、入力画面は入力の末尾の右。768px 未満はどちらも下に固定）。順は「やめる」→主。
 */
export function AppShell({ 'data-scr': scr, state, states, title, current, kind, primary, secondary, dirty = false, onSaveBeforeLeave, description, back, width = 'wide', children }: Props) {
  const sidebar = useMedia('(min-width: 1024px)')
  const header = useMedia('(min-width: 768px)')
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => { document.title = `${title} | ${appName}` }, [title])
  const seconds: ReactNode[] = Array.isArray(secondary) ? secondary.slice(0, 2) : secondary ? [secondary] : []
  const secondaries = seconds.map((s, i) => <Fragment key={i}>{s}</Fragment>)
  const hasActions = Boolean(primary || seconds.length)
  const hasBar = !header && hasActions
  const headerActions = header && kind === 'view' && hasActions ? <>{secondaries}{primary}</> : undefined
  const endActions = header && kind === 'form' && hasActions

  // 離れる確かめ（F-09）。画面は dirty を渡すだけ。
  const [leave, setLeave] = useState<{ proceed: Proceed } | null>(null)
  const [leaveSaving, setLeaveSaving] = useState(false)
  useLeaveGuard(dirty, (proceed) => { setMenuOpen(false); setLeave({ proceed }) })
  const saveAndLeave = async () => {
    if (!leave || !onSaveBeforeLeave) return
    setLeaveSaving(true)
    const saved = await onSaveBeforeLeave()
    setLeaveSaving(false)
    setLeave(null)
    if (saved) leave.proceed()
  }

  // 下に固定する帯の高さを測って、本文の下の余白にする（処理中の文言で帯が高くなっても最後の要素が隠れない）。
  const rootRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const bar = barRef.current
    const root = rootRef.current
    if (!bar || !root) return
    const measure = () => { if (bar.offsetHeight > 0) root.style.setProperty('--bar-h', `${bar.offsetHeight}px`) }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [hasBar])
  return (
    <div ref={rootRef} data-cmp="CMP-020" data-scr={scr} data-kind={kind} data-state={state} data-states={states.join(' ')} className="min-h-dvh bg-bg text-fg lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-30 focus:bg-panel focus:p-3">本文へ移動</a>
      {sidebar ? (
        <div className="flex w-56 shrink-0 flex-col gap-8 border-r border-line p-4 lg:sticky lg:top-0 lg:h-dvh">
          <p className="px-3 pt-3 text-large font-bold">{appName}</p>
          <NavList current={current} />
        </div>
      ) : (
        <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-2 md:px-8">
          <p className="text-large font-bold">{appName}</p>
          <Button leading="menu" onClick={() => setMenuOpen(true)}>メニュー</Button>
          <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="メニュー">
            <div onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setMenuOpen(false) }}>
              <NavList current={current} />
            </div>
          </Dialog>
        </header>
      )}
      <div className="min-w-0 flex-1">
        <main id="main" tabIndex={-1} className={cn('mx-auto flex w-full flex-col gap-8 px-4 py-6 md:gap-12 md:px-8 md:py-8', width === 'form' ? 'max-w-3xl' : 'max-w-6xl')}>
          <PageHeader
            title={title}
            description={description}
            actions={headerActions}
            back={back && (
              <Link to={back.to} params={back.params} className="inline-flex min-h-11 items-center gap-1 text-body md:min-h-9">
                <Icon name="arrow-left" size="sm" />
                {back.label}
              </Link>
            )}
          />
          {children}
          {endActions && <div data-actions="end" className="flex flex-wrap justify-end gap-2 border-t border-line pt-6">{secondaries}{primary}</div>}
        </main>
        {hasBar && <div aria-hidden data-bar-spacer className="h-(--bar-h)" />}
      </div>
      {hasBar && (
        <div ref={barRef} data-bar className={cn('fixed inset-x-0 bottom-0 z-10 grid gap-2 border-t border-line bg-bg p-4 *:w-full', seconds.length > 1 ? 'grid-cols-2 *:last:col-span-2' : 'auto-cols-fr grid-flow-col')}>
          {secondaries}
          {primary}
        </div>
      )}
      <LeaveDialog
        open={leave !== null}
        saving={leaveSaving}
        canSave={Boolean(onSaveBeforeLeave)}
        onStay={() => setLeave(null)}
        onDiscard={() => { const p = leave; setLeave(null); p?.proceed() }}
        onSave={() => void saveAndLeave()}
      />
    </div>
  )
}
