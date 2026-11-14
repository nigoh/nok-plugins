import { Button, Notice, Radio, RadioGroup } from '../../ui'
import type { ZipState } from './model'
import { Note } from './Note'
import { copy } from './copy'

type Props = { zip: ZipState; note?: string; onChoose: (address: string) => void; onRetry: () => void }

/**
 * 郵便番号の補完の結果を、郵便番号の欄の直下に出す。通信（相手側）の失敗でも、住所は手で入れられる（E-06）。
 * 待ちの文は 0.3 秒たってから出る（短い待ちでちらつかせない：A-03）。
 */
export function ZipResult({ zip, note, onChoose, onRetry }: Props) {
  return (
    <>
      <Note text={note} />
      {zip.kind === 'searching' && <p role="status" className="animate-wait-in text-body text-muted">{copy.zip.searching}</p>}
      {zip.kind === 'filled' && <Note text={copy.zip.filled} />}
      {zip.kind === 'kept' && <Note text={copy.zip.kept} />}
      {zip.kind === 'many' && (
        <RadioGroup legend={copy.zip.many(zip.options.length)}>
          {zip.options.map((o) => <Radio key={o} name="cf-address-choice" value={o} label={o} checked={zip.chosen === o} onChange={onChoose} />)}
        </RadioGroup>
      )}
      {zip.kind === 'empty' && <Notice tone="info">{copy.zip.empty}</Notice>}
      {zip.kind === 'error' && (
        <Notice tone="info" action={<Button onClick={onRetry}>{copy.zip.retry}</Button>}>{copy.zip.error}</Notice>
      )}
    </>
  )
}
