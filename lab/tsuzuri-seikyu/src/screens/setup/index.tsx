import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { AppShell } from '../../app/AppShell'
import { LinkButton } from '../../app/LinkButton'
import { actions, messages, screenNames } from '../../app/terms'
import type { ScreenDef } from '../../app/types'
import { useFake } from '../../data'
import { Button, ErrorState, ErrorSummary, Notice, Skeleton, Stepper, useFocusFirstInvalid, type FieldError } from '../../ui'
import { ClientStep } from './ClientStep'
import { CompanyStep } from './CompanyStep'
import { copy } from './copy'
import { DoneView } from './DoneView'
import { STEP_NAMES, specsOfStep } from './model'
import { RulesStep } from './RulesStep'
import { StepPanel } from './StepPanel'
import { useSetupFlow } from './useSetupFlow'

/** default＝1 段目。step_2・step_3＝2・3 段目。resumed＝途中でやめた続きから。save_failed＝最後の保存が失敗した。done＝終わったあとに開いた。 */
const STATES = ['default', 'step_2', 'step_3', 'resumed', 'invalid', 'saving', 'save_failed', 'loading', 'error', 'done'] as const
const FORM_ID = 'setup-form'

function Setup({ state }: { state: string }) {
  // 取り出すのは保存した入力（見本）。値の初期化は useSetupFlow が状態の名前から行う。
  const fake = useFake(state, () => null)
  const shown = fake.kind === 'ready' ? fake.state : state
  const flow = useSetupFlow(shown)
  const { step } = flow
  const formRef = useRef<HTMLFormElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const lastStep = useRef(step)
  useFocusFirstInvalid(formRef, flow.attempt)
  // 段が替わったら、新しい段の見出しへ（次に見る所を位置で示す。動きは付けない：A-05）
  useEffect(() => {
    if (lastStep.current === step) return
    lastStep.current = step
    headingRef.current?.focus()
  }, [step])

  const waiting = fake.kind === 'loading' || fake.kind === 'error'
  const isDone = shown === 'done'
  const list: FieldError[] = specsOfStep(step).filter((s) => flow.errors[s.key]).map((s) => ({ id: s.id, message: flow.errors[s.key] as string }))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (step === 3) void flow.finish(true)
    else flow.next()
  }
  // 変換を確定する Enter では送らない（I-09）
  const keepComposing = (e: KeyboardEvent) => { if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault() }
  const fields = { values: flow.values, errors: flow.errors, notes: flow.notes, onChange: flow.change, onBlur: flow.blur }

  return (
    <AppShell
      data-scr="SCR-010" state={state} states={STATES} title={screenNames.setup} current={null} kind="form" width="form"
      description={isDone ? undefined : copy.description}
      back={{ to: 'home', label: screenNames.home }}
      secondary={isDone ? undefined : step > 1 && !waiting ? <Button onClick={flow.back}>{actions.prev}</Button> : <LinkButton to="home">{actions.cancel}</LinkButton>}
      primary={
        isDone ? <LinkButton to="home" variant="primary">{copy.openHome}</LinkButton>
        : waiting ? <Button variant="primary" disabled>{actions.next}</Button>
        : <Button type="submit" form={FORM_ID} variant="primary" busy={flow.saving} busyLabel={step === 3 ? messages.saving : undefined}>{step === 3 ? copy.finish : actions.next}</Button>
      }
    >
      {isDone && <DoneView />}
      {fake.kind === 'loading' && <Skeleton lines={6} label={copy.loading} />}
      {fake.kind === 'error' && <ErrorState title={copy.loadFailedTitle} description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
      {!waiting && !isDone && (
        <>
          {shown === 'resumed' && (
            <Notice tone="info" title={copy.resumed(step)} action={<Button variant="quiet" onClick={flow.restart}>{copy.restart}</Button>} />
          )}
          <Stepper label={copy.stepperLabel} steps={[...STEP_NAMES]} current={step} />
          <form id={FORM_ID} ref={formRef} noValidate onSubmit={submit} onKeyDown={keepComposing} className="flex flex-col gap-6">
            <ErrorSummary errors={list} />
            <fieldset disabled={flow.saving} className="flex min-w-0 flex-col gap-6">
              <StepPanel step={step} headingRef={headingRef}>
                {step === 1 && <CompanyStep {...fields} />}
                {step === 2 && <RulesStep {...fields} />}
                {step === 3 && <ClientStep {...fields} onSkip={() => void flow.finish(false)} />}
              </StepPanel>
            </fieldset>
            {flow.failed && <Notice tone="fail">{messages.saveFailed}</Notice>}
          </form>
        </>
      )}
    </AppShell>
  )
}

export const screen: ScreenDef = { id: 'SCR-010', slug: 'setup', title: screenNames.setup, kind: 'form', states: [...STATES], Component: Setup }
