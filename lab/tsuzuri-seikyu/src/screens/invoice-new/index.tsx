import { useMemo } from 'react'
import { AppShell } from '../../app/AppShell'
import { useRoute } from '../../app/nav'
import { actions, messages, screenNames } from '../../app/terms'
import type { ScreenDef } from '../../app/types'
import { fakeSave, outcomeOf, useFake, type FakeSaveOutcome } from '../../data'
import { Button, ErrorState, Skeleton } from '../../ui'
import { copy } from './copy'
import { FORM_ID } from './fields'
import { InvoiceForm } from './InvoiceForm'
import { DATA_DEFAULT, DATA_MANY, emptySeed, makeSeed } from './seed'
import type { SaveFn } from './types'
import { useInvoiceForm } from './useInvoiceForm'

const STATES = ['default', 'loading', 'error', 'invalid', 'confirming', 'saving', 'save_failed', 'conflict', 'many'] as const

/** 偽の保存。通信は無く、待ちと結果（?state=save_failed なら失敗）は土台の fakeSave が決める。競合は画面の選び方で解くので、保存そのものは成功させる。 */
const fakeSaveFn = (outcome: FakeSaveOutcome): SaveFn => async (kind) => {
  const r = await fakeSave({ id: kind === 'send' ? 'inv-036' : 'inv-035' }, { outcome })
  return r.ok ? { ok: true, id: r.value.id } : { ok: false }
}

function Inner({ state, save }: { state: string; save: SaveFn }) {
  const clientParam = useRoute().params.get('client')
  const fake = useFake(state, (s) => (s === 'many' ? DATA_MANY : DATA_DEFAULT))
  const ready = fake.kind === 'ready'
  const data = fake.kind === 'ready' ? fake.data : DATA_DEFAULT
  const shown = fake.kind === 'ready' ? fake.state : state
  const seed = useMemo(() => (ready ? makeSeed(shown, data, clientParam) : emptySeed()), [ready, shown, data, clientParam])
  const form = useInvoiceForm({ seed, data, save })

  const busy = form.flow.kind === 'draftSaving'
  const stopped = !ready || form.conflict !== null
  return (
    <AppShell
      data-scr="SCR-003" state={state} states={STATES} title={screenNames['invoice-new']} current="invoices" kind="form" width="form"
      back={{ to: 'invoices', label: screenNames.invoices }}
      dirty={ready && form.dirty && form.flow.kind === 'editing'}
      onSaveBeforeLeave={form.saveBeforeLeave}
      secondary={<Button onClick={form.saveDraft} busy={busy} busyLabel={messages.saving} disabled={stopped}>{actions.saveDraft}</Button>}
      primary={<Button type="submit" form={FORM_ID} variant="primary" disabled={stopped}>{actions.reviewInvoice}</Button>}
    >
      {fake.kind === 'loading' && <Skeleton lines={8} label={copy.loading} />}
      {fake.kind === 'error' && <ErrorState description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {ready && <InvoiceForm form={form} />}
    </AppShell>
  )
}

/** save は保存の真似。テストでは失敗する関数に替えて、保存・送るの失敗を再現する。省くと ?state= から決まる。 */
export function InvoiceNew({ state, save }: { state: string; save?: SaveFn }) {
  const fallback = useMemo(() => fakeSaveFn(outcomeOf(state) === 'failed' ? 'failed' : 'ok'), [state])
  return <Inner key={state} state={state} save={save ?? fallback} />
}

function InvoiceNewScreen({ state }: { state: string }) {
  return <InvoiceNew state={state} />
}

export const screen: ScreenDef = { id: 'SCR-003', slug: 'invoice-new', title: screenNames['invoice-new'], kind: 'form', states: [...STATES], Component: InvoiceNewScreen }
