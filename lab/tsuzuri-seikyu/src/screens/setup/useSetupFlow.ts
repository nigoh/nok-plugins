import { useState } from 'react'
import { go } from '../../app/nav'
import { actions } from '../../app/terms'
import { fakeSave, outcomeOf } from '../../data'
import { formatError } from '../../lib'
import { useToast } from '../../ui'
import { copy } from './copy'
import { clearDraft, loadDraft, saveDraft } from './draft'
import {
  blankSetupValues, later, needsNote, normalized, setupSeedFor, specOf, specsOfStep, stateOfStep, stepOf, validateStep,
  type Errors, type Notes, type StepNo, type TextKey, type Values,
} from './model'

type Phase = 'idle' | 'saving' | 'failed'

/**
 * はじめての設定の「持ち場所」（S-07）。値・誤り・保存の局面を持ち、段の移動と保存の操作を渡す。
 * 段そのものは持たない（?state= から決まる）。入力は欄を直すたびに端末の中の保存先へ書く（途中でやめても続きから：REQ-026）。
 */
export function useSetupFlow(shown: string) {
  const toast = useToast()
  const [seed] = useState(() => setupSeedFor(shown, loadDraft()))
  const [resumedStep, setResumedStep] = useState<StepNo>(() => loadDraft()?.reached ?? 2)
  const [values, setValues] = useState<Values>(seed.values)
  const [errors, setErrors] = useState<Errors>(seed.errors)
  const [notes, setNotes] = useState<Notes>({})
  const [attempt, setAttempt] = useState(0)
  const [phase, setPhase] = useState<Phase>(shown === 'save_failed' ? 'failed' : 'idle')
  const step = stepOf(shown, resumedStep)

  const persist = (next: Values, reached: StepNo) => saveDraft({ values: next, reached: later(reached, loadDraft()?.reached ?? 1) })
  const drop = <T extends object>(map: T, key: keyof T): T => { const { [key]: _gone, ...rest } = map; return rest as T }

  const change = <K extends keyof Values>(key: K, value: Values[K]) => {
    const next = { ...values, [key]: value }
    setValues(next)
    persist(next, step)
    // 直した瞬間に誤りを消す（F-04）
    if (key in errors) {
      const spec = specOf(key as TextKey)
      const v = String(value).trim()
      if (v !== '' && !formatError(spec, normalized(spec, String(value)))) setErrors(drop(errors, key as TextKey))
    }
  }

  /** 欄を離れた時：全角などを半角に直して知らせ、形の誤りを欄の直下に出す。空欄は送る時まで叱らない（F-04）。 */
  const blur = (key: TextKey) => {
    const spec = specOf(key)
    const raw = values[key]
    const fixed = normalized(spec, raw)
    if (fixed !== raw) {
      change(key, fixed)
      if (needsNote(spec, raw)) setNotes({ ...notes, [key]: true })
    }
    if (fixed === '') return
    const e = formatError(spec, fixed)
    setErrors(e ? { ...errors, [key]: e } : drop(errors, key))
  }

  /** この段の検査。通れば値を直して保存し true。誤りがあれば欄の直下と一覧に出し、最初の誤り欄へ移る。 */
  const submitStep = (): boolean => {
    const next = { ...values }
    for (const spec of specsOfStep(step)) next[spec.key] = normalized(spec, values[spec.key])
    setValues(next)
    const found = validateStep(step, next)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      setAttempt((n) => n + 1)
      return false
    }
    setErrors({})
    persist(next, step === 3 ? 3 : ((step + 1) as StepNo))
    return true
  }

  const next = () => {
    if (step < 3 && submitStep()) go('setup', { state: stateOfStep((step + 1) as StepNo) })
  }
  const back = () => {
    if (step > 1) go('setup', step === 2 ? {} : { state: stateOfStep(2) })
  }

  /** 最後の保存。withClient=false は「あとで登録する」（取引先の欄は検査も保存もしない）。 */
  const finish = async (withClient: boolean) => {
    if (phase === 'saving' || shown === 'saving') return
    if (withClient && !submitStep()) return
    if (!withClient) setErrors({})
    setPhase('saving')
    const saved = withClient ? values : { ...values, clientName: '', clientEmail: '', contact: '' }
    const result = await fakeSave(saved, { outcome: outcomeOf(shown) })
    if (!result.ok) {
      setPhase('failed')
      return
    }
    clearDraft()
    toast.show({ message: copy.saved, tone: 'ok' })
    go('home')
  }

  /** 入力を消して 1 段目から。戻せる・届かない・お金に関わらないので、窓でなく直後の「元に戻す」で救う（E-08）。 */
  const restart = () => {
    const before = { values, reached: loadDraft()?.reached ?? step }
    clearDraft()
    setValues(blankSetupValues())
    setErrors({})
    setNotes({})
    setPhase('idle')
    go('setup')
    toast.show({
      message: copy.cleared,
      tone: 'info',
      action: {
        label: actions.undo,
        onAction: () => {
          saveDraft(before)
          setValues(before.values)
          setResumedStep(before.reached)
          go('setup', { state: 'resumed' })
        },
      },
    })
  }

  return { step, values, errors, notes, attempt, saving: phase === 'saving' || shown === 'saving', failed: phase === 'failed', change, blur, next, back, finish, restart }
}
