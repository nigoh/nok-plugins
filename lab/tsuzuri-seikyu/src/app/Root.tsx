import { useEffect, useState } from 'react'
import { ToastProvider } from '../ui'
import { useRoute, hrefTo } from './nav'
import { loadScreen, loadAllScreens, screenSlugs } from './registry'
import type { ScreenDef } from './types'

/** ?screen= で画面を、?state= で状態を選ぶ。どちらも無ければ画面の一覧（点検用）。画面は開くときに 1 枚だけ読む。 */
export function Root() {
  const route = useRoute()
  const known = route.screen != null && screenSlugs.includes(route.screen)
  return known ? <Screen slug={route.screen!} state={route.state} /> : <Index />
}

function Screen({ slug, state }: { slug: string; state: string | null }) {
  const [loaded, setLoaded] = useState<{ slug: string; def: ScreenDef | null } | null>(null)
  useEffect(() => {
    let live = true
    loadScreen(slug).then((def) => { if (live) setLoaded({ slug, def }) })
    return () => { live = false }
  }, [slug])
  const def = loaded && loaded.slug === slug ? loaded.def : null
  if (!def) return null
  const current = state && def.states.includes(state) ? state : def.states[0]
  return (
    <ToastProvider>
      <def.Component state={current} />
    </ToastProvider>
  )
}

function Index() {
  const [screens, setScreens] = useState<ScreenDef[]>([])
  useEffect(() => {
    let live = true
    loadAllScreens().then((all) => { if (live) setScreens(all) })
    return () => { live = false }
  }, [])
  return (
    <main className="mx-auto max-w-3xl p-6" data-scr="INDEX" data-states="default">
      <h1 className="text-title font-bold">画面の一覧</h1>
      <ul className="mt-4">
        {screens.map((s) => (
          <li key={s.id} className="border-b border-line py-3">
            <a className="inline-flex min-h-11 items-center font-bold text-ai-text underline" href={hrefTo(s.slug)}>{s.title}</a>
            <span className="ml-2 text-muted">{s.id}</span>
            <div className="flex flex-wrap gap-x-4">
              {s.states.map((st) => <a key={st} className="inline-flex min-h-11 min-w-11 items-center text-ai-text underline" href={hrefTo(s.slug, { state: st })}>{st}</a>)}
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
