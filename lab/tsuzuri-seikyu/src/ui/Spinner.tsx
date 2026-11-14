import { Icon } from './Icon'

/** 待ちの印（役割：待ち）。回り続けるので、動きを減らす設定では止める。読み上げには出さない（文言は隣に置く）。 */
export function Spinner() {
  return (
    <span data-cmp="CMP-028" className="inline-flex">
      <Icon name="loader" size="sm" className="animate-spin-slow motion-reduce:animate-none" />
    </span>
  )
}
