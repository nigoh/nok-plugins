import { useEffect, useRef, useState } from 'react'
import { actions } from '../../app/terms'
import { go } from '../../app/nav'
import { clients, fakeSave, outcomeOf, type Client, type ClientTerms } from '../../data'
import { useToast } from '../../ui'
import {
  blankContact, ids, MAX_CONTACTS, orderedIds, readField, signature, toClient, writeField,
  type Errors, type FormValues, type ZipState,
} from './model'
import { copy } from './copy'
import { fieldError, normalizeClientForm, normalizeField, validateClientForm } from './validate'
import { lookupZip } from './zip'

/** 保存して移る先は取引先の一覧。 */
const LIST = 'clients'

/** 状態ごとの確かめ用の初期値（?state= で見せる物）。 */
export type Seed = { values?: FormValues; errors?: Errors; zip?: ZipState; saving?: boolean; saveFailed?: boolean }

type Options = {
  /** 画面の状態（?state=）。save_failed のとき、保存の操作が失敗する（outcomeOf）。 */
  state: string
  /** 編集する取引先の id。新規は null。 */
  clientId: string | null
  /** 編集の元の値（「元に戻す」で書き戻す）。 */
  original: Client | null
  /** 最初の値。これと比べて未保存かを計算する。 */
  initial: FormValues
  defaults: ClientTerms
  seed?: Seed
}

const omit = <T extends Record<string, string>>(o: T, id: string): T => {
  if (!(id in o)) return o
  const { [id]: _removed, ...rest } = o
  return rest as T
}

/**
 * 入力の流れ（値・誤り・そろえた知らせ・補完・保存）。部品には値と操作だけを渡す。
 * 誤りは、形式は欄を離れた時、空欄の必須は送る時に出し、直した瞬間に消す（F-04）。
 */
export function useClientForm({ state, clientId, original, initial, seed }: Options) {
  const toast = useToast()
  const [values, setValues] = useState<FormValues>(seed?.values ?? initial)
  const [errors, setErrors] = useState<Errors>(seed?.errors ?? {})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [zip, setZip] = useState<ZipState>(seed?.zip ?? { kind: 'idle' })
  const [termsTouched, setTermsTouched] = useState(false)
  const [saving, setSaving] = useState(seed?.saving ?? false)
  const [saveFailed, setSaveFailed] = useState(seed?.saveFailed ?? false)
  const [attempt, setAttempt] = useState(0)
  const [baseline] = useState(() => signature(initial))

  const latest = useRef(values)
  const busy = useRef(seed?.saving ?? false)
  const token = useRef(0)
  const pendingFocus = useRef<string | null>(null)
  useEffect(() => { latest.current = values })
  useEffect(() => () => { token.current += 1 }, [])
  useEffect(() => {
    if (pendingFocus.current) {
      document.getElementById(pendingFocus.current)?.focus()
      pendingFocus.current = null
    }
  })

  const dirty = signature(values) !== baseline
  const errorList = orderedIds(values).filter((id) => errors[id]).map((id) => ({ id, message: errors[id] }))

  /** 郵便番号が 7 桁になったら住所を探す。補完は空の欄にだけ入れる（F-06・FP-5）。 */
  const search = (zipValue: string) => {
    const mine = (token.current += 1)
    setZip({ kind: 'searching' })
    lookupZip(zipValue).then(
      (list) => {
        if (mine !== token.current) return
        if (list.length === 0) setZip({ kind: 'empty' })
        else if (list.length > 1) setZip({ kind: 'many', options: list, chosen: null })
        else if (latest.current.address.trim() === '') {
          setValues((v) => ({ ...v, address: list[0] }))
          setZip({ kind: 'filled' })
        } else setZip({ kind: 'kept' })
      },
      () => { if (mine === token.current) setZip({ kind: 'error' }) },
    )
  }

  const change = (id: string, raw: string) => {
    const next = writeField(latest.current, id, raw)
    latest.current = next
    setValues(next)
    const recheck = id === ids.closing || id === ids.payMonths || id === ids.payDay ? [id, ids.payDay] : [id]
    setErrors((e) => recheck.reduce((acc, r) => (acc[r] && !fieldError(next, r, true) ? omit(acc, r) : acc), e))
    setNotes((n) => omit(n, id))
    if (id === ids.closing || id === ids.payMonths || id === ids.payDay) setTermsTouched(true)
    if (id === ids.zip) {
      const n = normalizeField(ids.zip, raw).value
      if (/^\d{3}-\d{4}$/.test(n)) search(n)
      else { token.current += 1; setZip({ kind: 'idle' }) }
    }
  }

  const blur = (id: string) => {
    const raw = readField(latest.current, id)
    const { value, note } = normalizeField(id, raw)
    const next = value === raw ? latest.current : writeField(latest.current, id, value)
    if (next !== latest.current) { latest.current = next; setValues(next) }
    setNotes((n) => (note ? { ...n, [id]: note } : omit(n, id)))
    const msg = fieldError(next, id, false)
    setErrors((e) => (msg ? { ...e, [id]: msg } : omit(e, id)))
  }

  const chooseAddress = (address: string) => {
    setValues((v) => ({ ...v, address }))
    setZip((z) => (z.kind === 'many' ? { ...z, chosen: address } : z))
  }
  const retryZip = () => search(normalizeField(ids.zip, latest.current.zip).value)

  const addContact = () => {
    if (latest.current.contacts.length >= MAX_CONTACTS) return
    const row = blankContact()
    const i = latest.current.contacts.length
    pendingFocus.current = `cf-c${i}-name`
    setValues((v) => ({ ...v, contacts: [...v.contacts, row] }))
  }

  const removeContact = (i: number) => {
    const rows = latest.current.contacts
    if (rows.length <= 1) return
    const removed = rows[i]
    pendingFocus.current = ids.addContact
    setValues((v) => ({ ...v, contacts: v.contacts.filter((_, j) => j !== i) }))
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([id]) => !id.startsWith('cf-c'))))
    toast.show({
      message: copy.contact.removed(i + 1),
      tone: 'ok',
      action: {
        label: actions.undo,
        onAction: () => setValues((v) => (v.contacts.length >= MAX_CONTACTS ? v : { ...v, contacts: [...v.contacts.slice(0, i), removed, ...v.contacts.slice(i)] })),
      },
    })
  }

  /**
   * 保存の流れ。誤りがあれば出して止まり、通れば保存する。1 回だけ効く（E-09）。
   * leaving=true は離れる窓の「保存して離れる」から。行き先へ移るのは骨格なので、ここでは一覧へ移らない。
   * 失敗は例外でなく値で受ける（fakeSave）。入力は残し、saveFailed を立てる。
   */
  const submit = async (leaving = false): Promise<boolean> => {
    if (busy.current) return false
    const fixed = normalizeClientForm(latest.current)
    latest.current = fixed
    setValues(fixed)
    const found = validateClientForm(fixed)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setAttempt((n) => n + 1)
      return false
    }
    busy.current = true
    setSaving(true)
    setSaveFailed(false)
    const edit = clientId !== null
    const result = await fakeSave(toClient(fixed, clientId ?? `c${String(clients.length + 1).padStart(2, '0')}`), { outcome: outcomeOf(state) })
    if (!result.ok) {
      busy.current = false
      setSaving(false)
      setSaveFailed(true)
      return false
    }
    if (edit) {
      toast.show({
        message: copy.saved.save,
        tone: 'ok',
        action: {
          label: actions.undo,
          onAction: () => {
            if (!original) return
            fakeSave(original, { outcome: outcomeOf(state) }).then((r) =>
              toast.show(r.ok ? { message: copy.saved.undone, tone: 'ok' } : { message: copy.saved.undoFail, tone: 'fail' }),
            )
          },
        },
      })
    } else {
      toast.show({ message: copy.saved.create, tone: 'ok', action: { label: actions.createInvoice, onAction: () => go('invoice-new') } })
    }
    if (!leaving) go(LIST)
    return true
  }

  return {
    values, errors, errorList, notes, zip, termsTouched, saving, saveFailed, attempt, dirty,
    change, blur, chooseAddress, retryZip, addContact, removeContact, submit,
  }
}

export type ClientForm = ReturnType<typeof useClientForm>
