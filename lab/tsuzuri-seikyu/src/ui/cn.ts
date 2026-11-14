/** クラス名をつなぐだけの道具。条件が偽のものは捨てる。 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
