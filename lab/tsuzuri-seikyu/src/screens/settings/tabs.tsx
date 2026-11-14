import type { ComponentType } from 'react'
import type { TabId } from './fields'
import { CompanyPanel } from './CompanyPanel'
import { InvoicePanel } from './InvoicePanel'
import { NotifyPanel } from './NotifyPanel'
import type { SettingsForm } from './useSettingsForm'

/** 区分ごとの中身。区分を足すときは fields.ts の TABS と、ここと、新しい中身の 3 か所。 */
export const PANELS: Record<TabId, ComponentType<{ form: SettingsForm }>> = {
  company: CompanyPanel,
  invoice: InvoicePanel,
  notify: NotifyPanel,
}
