import { Button } from '../../ui'
import { ContactRow } from './ContactRow'
import { ids, MAX_CONTACTS } from './model'
import { copy } from './copy'
import type { ClientForm } from './useClientForm'

/** 担当者（最大 5 名）。足す・消す。5 名で足せなくなり、その理由を隣に書く（W-10）。 */
export function ContactsSection({ form }: { form: ClientForm }) {
  const rows = form.values.contacts
  const full = rows.length >= MAX_CONTACTS
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-large font-bold">{copy.section.contacts}</h2>
      <div className="flex flex-col gap-6">
        {rows.map((row, i) => <ContactRow key={row.key} form={form} index={i} row={row} removable={rows.length > 1} />)}
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Button id={ids.addContact} leading="plus" disabled={full} onClick={form.addContact}>{copy.contact.add}</Button>
          {full && <p className="text-body text-muted">{copy.contact.limit(MAX_CONTACTS)}</p>}
        </div>
      </div>
    </section>
  )
}
