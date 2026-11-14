import { useEffect, useRef, useState } from 'react'
import { AppShell } from '../../app/AppShell'
import { LinkButton } from '../../app/LinkButton'
import { useRoute } from '../../app/nav'
import { actions, messages, screenNames } from '../../app/terms'
import type { ScreenDef } from '../../app/types'
import { clients, defaultSettings, type Client, type ClientTerms, useFake, type Fake } from '../../data'
import { Button, ErrorState, useFocusFirstInvalid } from '../../ui'
import { ClientFormBody } from './ClientFormBody'
import { copy } from './copy'
import { FormSkeleton } from './FormSkeleton'
import { blankClientValues, toValues } from './model'
import { NotFound } from './NotFound'
import { clientSeedFor } from './seeds'
import { useClientForm } from './useClientForm'

const STATES = ['default', 'mode_edit', 'loading', 'error', 'not_found', 'invalid', 'saving', 'save_failed', 'confirming', 'zip_many', 'zip_empty', 'zip_error'] as const
const FORM_ID = 'client-form'

/** 取得の結果。client が無いのは新規、missing は編集で取引先が見つからないとき。 */
type Data = { client: Client | null; missing: boolean; defaults: ClientTerms }

function makeData(state: string, editId: string | null): Data {
  const defaults = defaultSettings.defaultTerms
  if (editId === null || state === 'not_found') return { client: null, missing: state === 'not_found' || editId !== null, defaults }
  const client = clients.find((c) => c.id === editId) ?? null
  return { client, missing: client === null, defaults }
}

type PageProps = { state: string; editId: string | null; fake: Fake<Data> }

/** 画面の本体。入力の流れを持ち、骨格に主・副・戻りと、未保存かどうか（dirty）を渡す。離れる窓は骨格が出す。 */
function Page({ state, editId, fake }: PageProps) {
  const edit = editId !== null
  const ready = fake.kind === 'ready'
  const data = fake.kind === 'ready' ? fake.data : null
  const missing = data?.missing ?? false
  const defaults = data?.defaults ?? defaultSettings.defaultTerms
  const [initial] = useState(() => (data?.client ? toValues(data.client) : blankClientValues(defaults)))
  const [seed] = useState(() => (ready && !edit ? clientSeedFor(state, defaults) : undefined))
  const formRef = useRef<HTMLFormElement>(null)
  const form = useClientForm({ state, clientId: edit ? editId : null, original: data?.client ?? null, initial, defaults, seed })
  useFocusFirstInvalid(formRef, form.attempt)
  // ?state=confirming：離れる窓を最初から出す。骨格に窓を開く入口が無いので、戻りのリンクを 1 度押す（報告済み）。
  useEffect(() => {
    if (state === 'confirming' && ready && !missing) document.querySelector<HTMLAnchorElement>('main a[href="?screen=clients"]')?.click()
  }, [state, ready, missing])

  const showActions = !(ready && missing)
  return (
    <AppShell
      data-scr="SCR-006" state={state} states={STATES} current="clients" kind="form" width="form"
      title={edit ? copy.titleEdit : screenNames['client-form']}
      description={!edit && ready ? copy.description : undefined}
      back={{ to: 'clients', label: screenNames.clients }}
      dirty={ready && !missing && form.dirty && !form.saving}
      onSaveBeforeLeave={() => form.submit(true)}
      secondary={showActions && (form.saving ? <Button disabled>{actions.cancel}</Button> : <LinkButton to="clients">{actions.cancel}</LinkButton>)}
      primary={showActions && (
        <Button
          type="submit" form={FORM_ID} variant="primary" disabled={!ready} busy={form.saving}
          busyLabel={edit ? messages.saving : copy.busy.create}
        >
          {edit ? actions.save : actions.createClient}
        </Button>
      )}
    >
      {fake.kind === 'loading' && <FormSkeleton />}
      {fake.kind === 'error' && <ErrorState description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {ready && missing && <NotFound />}
      {ready && !missing && <ClientFormBody id={FORM_ID} form={form} formRef={formRef} edit={edit} onSubmit={() => void form.submit()} />}
    </AppShell>
  )
}

/** 取るデータ：編集する取引先 1 件と設定の標準の条件。URL の id で編集、無ければ新規。取得の結果が替わったら Page を作り直す。 */
function ClientFormScreen({ state }: { state: string }) {
  const route = useRoute()
  const editId = route.params.get('id') ?? (state === 'mode_edit' ? 'c03' : state === 'not_found' ? 'c99' : null)
  const fake = useFake<Data>(state, (s) => makeData(s, editId))
  return <Page key={fake.kind} state={state} editId={editId} fake={fake} />
}

export const screen: ScreenDef = { id: 'SCR-006', slug: 'client-form', title: screenNames['client-form'], kind: 'form', states: [...STATES], Component: ClientFormScreen }
