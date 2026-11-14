import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useUrlParam } from '../../app/nav'
import { messages } from '../../app/terms'
import { formatError } from '../../lib'
import { markFor, useFocusFirstInvalid } from '../../ui'
import { FIELD, FIELD_COUNT, FIELDS, TABS, type NotifyKey, type TabId } from './fields'
import { firstErrorTab, normalize, normalizeSettings, ruleOf, validateSettings, widenedKey } from './model'
import type { Errors, Notes, Saver, Scenario, TextKey, Values } from './types'
import { useSaveFlow } from './useSaveFlow'

const readTab = (raw: string): TabId => TABS.find((t) => t.id === raw)?.id ?? TABS[0].id

/**
 * この画面の入力の流れ。入力値・誤り・知らせ・区分・保存の流れ・離れる確かめをまとめて持つ。
 * 欄の部品はこの型（SettingsForm）だけを受け取る。
 */
export function useSettingsForm(scenario: Scenario, save: Saver) {
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<Values>(scenario.mine)
  const [errors, setErrors] = useState<Errors>(() => (scenario.showErrors ? validateSettings(normalizeSettings(scenario.mine)) : {}))
  const [notes, setNotes] = useState<Notes>({})
  const [attempt, setAttempt] = useState(scenario.showErrors ? 1 : 0)
  // 区分は URL の tab（既定の「自社の情報」は URL に書かない。履歴には積まない）。
  const [tabRaw, setTabRaw] = useUrlParam('tab', TABS[0].id)
  const tab = readTab(tabRaw)
  const [jump, setJump] = useState<{ id: string } | null>(null)
  useFocusFirstInvalid(formRef, attempt)
  useEffect(() => {
    if (jump) document.getElementById(jump.id)?.focus()
  }, [jump])

  const setTab = (id: TabId) => setTabRaw(id)
  // 誤りを見せて開く状態（invalid）は、最初の誤りの区分から始める
  useEffect(() => {
    const first = scenario.showErrors ? firstErrorTab(validateSettings(normalizeSettings(scenario.mine))) : null
    if (first) setTabRaw(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 保存する前の確かめ：全欄を正規化して入れ直し、誤りがあれば最初の誤りの区分へ移す。 */
  const check = (): Values | null => {
    const fixed = normalizeSettings(values)
    const found = validateSettings(fixed)
    setValues(fixed)
    setNotes({})
    setErrors(found)
    const first = firstErrorTab(found)
    if (!first) return fixed
    setTab(first)
    setAttempt((n) => n + 1)
    return null
  }

  const flow = useSaveFlow({ scenario, values, setValues, check, save })

  const setText = (key: TextKey, raw: string) => {
    setValues((v) => ({ ...v, [key]: raw }))
    setNotes((n) => ({ ...n, [key]: undefined }))
    // 誤りが出ている欄は、直った時点で消す（直している最中に責めない）
    if (errors[key] && formatError(ruleOf(key), normalize(key, raw)) === undefined && !(FIELD[key].required && raw.trim() === '')) {
      setErrors((e) => ({ ...e, [key]: undefined }))
    }
  }

  /** 欄を離れた時：正規化して入れ直し、半角へ直したなら知らせ、形の誤りを見る（空は保存する時まで見ない）。 */
  const blur = (key: TextKey) => {
    const raw = values[key]
    const fixed = normalize(key, raw)
    if (fixed !== raw) setValues((v) => ({ ...v, [key]: fixed }))
    setNotes((n) => ({ ...n, [key]: widenedKey(key, raw) ? messages.widened : undefined }))
    // 空は保存する時の確かめの物なので、離れただけでは消さない・出さない
    setErrors((e) => ({ ...e, [key]: fixed === '' ? e[key] : formatError(ruleOf(key), fixed) }))
  }

  const setRounding = (rounding: Values['rounding']) => setValues((v) => ({ ...v, rounding }))
  const setNotify = (key: NotifyKey, on: boolean) => setValues((v) => ({ ...v, [key]: on }))

  /** 誤りの一覧のリンク：別の区分の欄なら、区分を移してから欄へフォーカスする。 */
  const onJump = (e: MouseEvent<HTMLFormElement>) => {
    const link = (e.target as Element).closest?.('a[href^="#settings-"]')
    if (!link) return
    const id = (link.getAttribute('href') ?? '').slice(1)
    const def = FIELDS.find((f) => f.id === id)
    if (!def || def.tab === tab) return
    e.preventDefault()
    setTab(def.tab)
    setJump({ id })
  }

  /** 文字の欄 1 つぶんの引数（ui の TextField へ展開する）。ラベル・補足・必須・誤りは fields.ts の定義から（T-6）。 */
  const fieldProps = (key: TextKey, hint?: string) => {
    const def = FIELD[key]
    return {
      id: def.id, label: def.label, hint: hint ?? def.hint, error: errors[key], required: def.required, mark: markFor(def.required, FIELD_COUNT),
      note: notes[key], value: values[key], onChange: (v: string) => setText(key, v), onBlur: () => blur(key), disabled: flow.saving,
    }
  }

  const errorList = FIELDS.filter((f) => errors[f.key]).map((f) => ({ id: f.id, message: errors[f.key] as string }))

  return { ...flow, scenario, formRef, values, errors, errorList, notes, tab, setTab, fieldProps, setText, blur, setRounding, setNotify, check, onJump }
}

export type SettingsForm = ReturnType<typeof useSettingsForm>
