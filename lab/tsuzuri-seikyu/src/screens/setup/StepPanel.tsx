import type { ReactNode, Ref } from 'react'
import { messages } from '../../app/terms'
import { markFor, TextField } from '../../ui'
import { copy } from './copy'
import { setupFieldCount, specOf, STEP_NAMES, type StepNo, type StepProps, type TextKey } from './model'

/** 段の見出し（h2）と導入文、その下に欄。段が替わるとフォーカスが見出しへ移る（次に見る所を位置で示す。index.tsx）。 */
export function StepPanel({ step, headingRef, children }: { step: StepNo; headingRef: Ref<HTMLHeadingElement>; children: ReactNode }) {
  return (
    <section aria-labelledby="setup-step-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="setup-step-heading" ref={headingRef} tabIndex={-1} className="text-large font-bold">{STEP_NAMES[step - 1]}</h2>
        <p className="text-body text-muted">{copy.intro[step]}</p>
      </div>
      {children}
    </section>
  )
}

/** 外側の幅の上限（郵便番号・電話は短い欄）。 */
const width = { zip: 'max-w-48', tel: 'max-w-xs' } as const

/**
 * 欄の表（model.ts）の 1 行を、ui の TextField 1 つにして出す。必須・任意の印は段の欄の数で決まる（F-03）。
 * 直したことは補足の末尾（messages.widened）に出し、読み上げには status を 1 行足す（補足は読み上げが拾わない）。
 */
export function StepField({ field, step, values, errors, notes, onChange, onBlur }: StepProps & { field: TextKey; step: StepNo }) {
  const spec = specOf(field)
  const noted = notes[field]
  return (
    <>
      <TextField
        id={spec.id} label={spec.label} hint={spec.hint} error={errors[field]} required={spec.required} mark={markFor(spec.required, setupFieldCount(step))}
        note={noted ? messages.widened : undefined} value={values[field]} onChange={(v) => onChange(field, v)} onBlur={() => onBlur(field)}
        type={spec.input.type} inputMode={spec.input.inputMode} autoComplete={spec.input.autoComplete} className={spec.input.width ? width[spec.input.width] : undefined}
      />
      {noted && <span role="status" className="sr-only">{copy.normalizedStatus(spec.label)}</span>}
    </>
  )
}
