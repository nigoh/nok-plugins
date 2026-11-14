import type { ScreenDef } from './types'

/**
 * 画面は 1 枚ずつ遅れて読む（M-29：最初に読むのは骨格と、いま開く 1 画面だけ）。
 * フォルダの名前 = slug。`src/screens/<slug>/index.tsx` が `export const screen` を出す。
 */
const loaders = import.meta.glob<{ screen: ScreenDef }>('../screens/*/index.tsx')
const slugOf = (path: string) => path.split('/').slice(-2)[0]
const bySlug = new Map(Object.entries(loaders).map(([p, load]) => [slugOf(p), load]))

export const screenSlugs = [...bySlug.keys()]

/** 1 画面だけ読む。無い slug は null。 */
export async function loadScreen(slug: string | null): Promise<ScreenDef | null> {
  const load = slug ? bySlug.get(slug) : undefined
  return load ? (await load()).screen ?? null : null
}

/** 全画面を読む（画面の一覧＝点検用のページだけが使う）。 */
export async function loadAllScreens(): Promise<ScreenDef[]> {
  const mods = await Promise.all([...bySlug.values()].map((load) => load()))
  return mods.map((m) => m.screen).filter(Boolean).sort((a, b) => a.id.localeCompare(b.id))
}
