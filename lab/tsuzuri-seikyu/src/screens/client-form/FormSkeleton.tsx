import { Skeleton } from '../../ui'

/** 読み込みの骨組み。入力の節と同じ並び・同じ高さの目安で、0.3 秒たってから出る（土台の Skeleton）。 */
export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-8 md:gap-12">
      <Skeleton variant="block" label="取引先の情報を読み込んでいます" className="h-80" />
      <Skeleton variant="block" label="支払いの条件を読み込んでいます" className="h-40" />
      <Skeleton variant="block" label="担当者を読み込んでいます" className="h-80" />
    </div>
  )
}
