import type { ReactNode } from 'react'
import { cn } from './cn'
import { Icon, type IconName } from './Icon'

/**
 * 札の調子（color-state.md C-01・C-02）。業務の言葉（請求書の状況など）は上の層で調子に直して渡す。
 * wait=人の確認待ち（人が判断する。期限超過を含む）／progress=作業中（人は待つだけ）／fail=失敗／done=完了（成果がある）／
 * calm=一区切り（取り消し済み・有効期間切れ。人がもう何もできない）／draft=まだ始まっていない
 */
export type StatusTone = 'wait' | 'progress' | 'fail' | 'done' | 'calm' | 'draft'

/**
 * 調子ごとに絵は 1 つずつ別（C-04）。札の中の絵は回さない：progress の絵も止めたまま。
 * 回してよいのは押して処理中のボタンと、画面に 1 つの待ちの印だけ（Spinner）。
 * 地の色 bg と文字の色 text は通常の札、quiet は「静かな札」（地なし。C-08・C-05）。
 */
const tones: Record<StatusTone, { icon: IconName; bg: string; text: string; quietText: string }> = {
  wait: { icon: 'hand', bg: 'bg-warn-soft', text: 'text-warn-text', quietText: 'text-warn-text' },
  progress: { icon: 'refresh-cw', bg: 'bg-ai-soft', text: 'text-ai-text', quietText: 'text-ai-text' },
  fail: { icon: 'circle-x', bg: 'bg-bad-soft', text: 'text-bad-text', quietText: 'text-bad-text' },
  done: { icon: 'circle-check', bg: 'bg-ok-soft', text: 'text-ok-text', quietText: 'text-ok-text' },
  calm: { icon: 'circle-minus', bg: 'bg-quiet', text: 'text-quiet-text', quietText: 'text-quiet-text' },
  draft: { icon: 'pencil', bg: 'bg-quiet', text: 'text-quiet-text', quietText: 'text-quiet-text' },
}

/** 札の見え方。normal=地・絵・言葉（太字）／plain=同じで太さ 400／quiet=地なし、絵と言葉だけ。選び方は parts の tagDensityOf（C-08）。 */
export type TagDensity = 'normal' | 'plain' | 'quiet'

type Props = { tone: StatusTone; density?: TagDensity; children: ReactNode; className?: string }

/** CMP-003。状況の札。色だけで伝えない：絵と言葉を必ず添える。絵は回さない。 */
export function StatusTag({ tone, density = 'normal', children, className }: Props) {
  const t = tones[tone]
  return (
    <span
      data-cmp="CMP-003"
      data-tone={tone}
      data-density={density}
      className={cn(
        'inline-flex items-center gap-1 rounded-tag py-1 text-body whitespace-nowrap',
        density === 'quiet' ? `px-0 ${t.quietText}` : `px-2 ${t.bg} ${t.text}`,
        density === 'plain' || density === 'quiet' ? 'font-normal' : 'font-bold',
        className,
      )}
    >
      <Icon name={t.icon} size="sm" />
      {children}
    </span>
  )
}
