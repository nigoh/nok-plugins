import { AppShell } from '../../app/AppShell'
import { actions, messages, screenNames } from '../../app/terms'
import type { ScreenDef } from '../../app/types'
import { useFake, type Fake } from '../../data'
import { Button, ErrorState, Skeleton } from '../../ui'
import { CONFLICT_REASON_ID } from './ConflictPanel'
import { copy } from './copy'
import { NumberingDialog } from './NumberingDialog'
import { saverFor, scenarioFor } from './scenario'
import { FORM_ID, SettingsFormView } from './SettingsFormView'
import type { Saver, Scenario } from './types'
import { useSettingsForm } from './useSettingsForm'

const STATES = ['default', 'loading', 'error', 'invalid', 'saving', 'save_failed', 'confirming', 'conflict'] as const

type FrameProps = { state: string; fake: Fake<Scenario>; save: Saver }

/**
 * 画面の本体。入力の流れ（useSettingsForm）を持ち、骨格に主・戻りを渡す。
 * 主ボタンが入力の流れの状態（保存中・食い違い）を使うので、骨格と入力は同じ部品の中に置く。
 * 取得の結果が替わったら作り直す（key）。save は外から差し替えられる（本物の保存・試験）。
 */
export function SettingsFrame({ state, fake, save }: FrameProps) {
  const ready = fake.kind === 'ready'
  const form = useSettingsForm(ready ? fake.data : scenarioFor('default'), save)
  const blocked = form.conflict !== null
  const numbering = form.numbering
  return (
    <AppShell
      data-scr="SCR-009" state={state} states={STATES} title={screenNames.settings} current="settings" kind="form" width="form"
      back={{ to: 'home', label: screenNames.home }}
      dirty={form.dirty && !form.saving} onSaveBeforeLeave={form.saveBeforeLeave}
      primary={
        <Button
          type="submit" form={FORM_ID} variant="primary" disabled={!ready || blocked} busy={form.saving} busyLabel={messages.saving}
          aria-describedby={blocked ? CONFLICT_REASON_ID : undefined}
        >
          {actions.save}
        </Button>
      }
    >
      {fake.kind === 'loading' && <Skeleton lines={8} />}
      {fake.kind === 'error' && <ErrorState description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {ready && <SettingsFormView form={form} />}
      <NumberingDialog
        open={numbering !== null}
        from={numbering?.from.numberPrefix ?? ''}
        to={numbering?.next.numberPrefix ?? ''}
        issuedThisYear={form.scenario.issuedThisYear}
        saving={form.saving}
        failed={form.failed}
        onClose={form.closeNumbering}
        onConfirm={form.confirmNumbering}
      />
    </AppShell>
  )
}

/** 取るデータ：設定は 1 件。状態名から、開いたときの材料を作る。 */
function Settings({ state }: { state: string }) {
  const made = useFake<Scenario>(state, scenarioFor, copy.loadFailed)
  // useFake は save_failed の読み込みを default で返す。失敗の見本はここで足す
  const fake = made.kind === 'ready' && state === 'save_failed' ? { ...made, data: scenarioFor(state) } : made
  return <SettingsFrame key={fake.kind} state={state} fake={fake} save={saverFor(state)} />
}

export const screen: ScreenDef = { id: 'SCR-009', slug: 'settings', title: screenNames.settings, kind: 'form', states: [...STATES], Component: Settings }
