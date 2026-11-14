import type { RefObject } from 'react'
import { messages } from '../../app/terms'
import { ErrorSummary, Notice } from '../../ui'
import { ContactsSection } from './ContactsSection'
import { InfoSection } from './InfoSection'
import { TermsSection } from './TermsSection'
import { copy } from './copy'
import type { ClientForm } from './useClientForm'

type Props = { id: string; form: ClientForm; formRef: RefObject<HTMLFormElement | null>; edit: boolean; onSubmit: () => void }

/**
 * 入力の本体。節を順に並べるだけで、取得も移動もしない。
 * 送っている最中は fieldset で欄を変えられなくする（F-10）。保存の失敗は、操作（末尾）の直上に出し、入力は残す（E-06）。
 */
export function ClientFormBody({ id, form, formRef, edit, onSubmit }: Props) {
  return (
    <form
      id={id}
      ref={formRef}
      noValidate
      onSubmit={(e) => { e.preventDefault(); onSubmit() }}
      onKeyDown={(e) => { if (e.key === 'Enter' && e.nativeEvent.isComposing) e.preventDefault() }}
      className="flex flex-col gap-8 md:gap-12"
    >
      <ErrorSummary errors={form.errorList} />
      <fieldset disabled={form.saving} className="flex min-w-0 flex-col gap-8 md:gap-12">
        <InfoSection form={form} />
        <TermsSection form={form} edit={edit} />
        <ContactsSection form={form} />
      </fieldset>
      {form.saveFailed && <Notice tone="fail">{edit ? messages.saveFailed : copy.saveFailCreate}</Notice>}
    </form>
  )
}
