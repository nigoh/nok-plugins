/** 欄をそろえた・補完したなどの短い知らせ。読み上げには控えめに伝える（role=status）。無ければ何も出さない。 */
export function Note({ text }: { text?: string }) {
  if (!text) return null
  return <p role="status" className="text-body text-muted">{text}</p>
}
