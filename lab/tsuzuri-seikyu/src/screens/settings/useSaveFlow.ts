import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { actions } from '../../app/terms'
import { useToast } from '../../ui'
import { copy } from './copy'
import { mergeKeepingMine, overlapKeys, sameValues } from './model'
import type { Conflict, Saver, Scenario, Values } from './types'

/** 番号の頭を変える前の確かめの窓が持つ物：次に保存する値と、いまの値。 */
export type NumberingAsk = { next: Values; from: Values }

type RunOptions = { force?: boolean; message?: string; undoable?: boolean }

type Args = {
  scenario: Scenario
  values: Values
  setValues: Dispatch<SetStateAction<Values>>
  /** 正規化と検査。通れば直した値、通らなければ null（誤りは欄に出る）。 */
  check: () => Values | null
  save: Saver
}

/**
 * 保存の流れ（F-09・E-08・E-09）。保存済みの値と版・保存の最中・失敗・食い違い・控え・番号の確かめを持つ。
 * 失敗しても入力は残す。食い違いは、重ならない更新は黙って取り込み、同じ項目が違うときだけ人に選ばせる。
 * 離れる窓は骨格（AppShell）が出す。ここは「保存して離れる」で呼ばれる saveBeforeLeave だけ持つ。
 */
export function useSaveFlow({ scenario, values, setValues, check, save }: Args) {
  const toast = useToast()
  const [saved, setSaved] = useState(scenario.saved)
  const versionRef = useRef(scenario.version)
  const busy = useRef(false)
  const [saving, setSaving] = useState(scenario.saving)
  const [failed, setFailed] = useState(scenario.saveFailed)
  const [conflict, setConflict] = useState<Conflict | null>(scenario.conflict)
  const [backup, setBackup] = useState<Values | null>(null)
  const [numbering, setNumbering] = useState<NumberingAsk | null>(scenario.dialog === 'numbering' ? { next: scenario.mine, from: scenario.saved } : null)

  const dirty = !sameValues(values, saved)

  /** 保存する。保存できたら true（食い違いで人の選びを待つとき・失敗したときは false）。 */
  const run = async (next: Values, o: RunOptions = {}): Promise<boolean> => {
    if (busy.current) return false
    busy.current = true
    setSaving(true)
    setFailed(false)
    const before = saved
    const result = await save({ values: next, baseVersion: versionRef.current, force: o.force }).catch((): { kind: 'fail' } => ({ kind: 'fail' }))
    busy.current = false
    setSaving(false)
    if (result.kind === 'fail') {
      setFailed(true)
      return false
    }
    versionRef.current = result.version
    if (result.kind === 'conflict') {
      if (overlapKeys(saved, next, result.theirs).length === 0) return run(mergeKeepingMine(saved, next, result.theirs), { ...o, force: true, message: copy.mergedSaved })
      setConflict({ at: result.at, base: saved, theirs: result.theirs })
      setNumbering(null)
      return false
    }
    setSaved(next)
    setValues(next)
    setConflict(null)
    setNumbering(null)
    toast.show({
      message: o.message ?? copy.saved,
      tone: 'ok',
      action: o.undoable === false ? undefined : { label: actions.undo, onAction: () => void run(before, { undoable: false, message: copy.restored }) },
    })
    return true
  }

  /** 番号の頭が変わるときは、保存の前に確かめの窓を出す（E-08）。窓を出したときは false（まだ保存していない）。 */
  const request = (next: Values, from: Values, o: RunOptions = {}): Promise<boolean> => {
    if (next.numberPrefix !== from.numberPrefix) {
      setNumbering({ next, from })
      return Promise.resolve(false)
    }
    return run(next, o)
  }

  const submit = () => {
    if (busy.current) return
    const fixed = check()
    if (fixed) void request(fixed, saved)
  }

  const confirmNumbering = () => {
    if (numbering) void run(numbering.next, { force: conflict !== null })
  }

  /**
   * 骨格の離れる窓の「保存して離れる」。保存できたら true（骨格が離れる）。
   * 誤りがある・食い違いを選んでいない・失敗した・番号の確かめが要るときは false（窓を閉じて画面に残り、誤りや窓を見せる）。
   */
  const saveBeforeLeave = async (): Promise<boolean> => {
    if (busy.current || conflict !== null) return false
    const fixed = check()
    if (!fixed) return false
    return request(fixed, saved, { undoable: false })
  }

  const closeNumbering = () => { setNumbering(null); setFailed(false) }

  /** 相手の内容を使う：自分の入力は控えに残し、画面を相手の内容にそろえる。 */
  const takeTheirs = () => {
    if (!conflict) return
    setBackup(values)
    setValues(conflict.theirs)
    setSaved(conflict.theirs)
    setConflict(null)
  }
  const restoreMine = () => {
    if (!backup) return
    setValues(backup)
    setBackup(null)
  }
  /** 上書きして保存する：同じ項目は自分の内容、重ならない相手の更新は取り込む。 */
  const overwrite = () => {
    if (!conflict || busy.current) return
    const fixed = check()
    if (!fixed) return
    void request(mergeKeepingMine(conflict.base, fixed, conflict.theirs), conflict.theirs, { force: true })
  }

  return { saved, saving, failed, conflict, backup, numbering, dirty, submit, confirmNumbering, closeNumbering, saveBeforeLeave, takeTheirs, restoreMine, overwrite }
}
