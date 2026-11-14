import { ErrorSummary, Tabs, tabPanelProps } from '../../ui'
import { BackupNotice } from './BackupNotice'
import { ConflictPanel } from './ConflictPanel'
import { TABS } from './fields'
import { SaveStatus } from './SaveStatus'
import { PANELS } from './tabs'
import type { SettingsForm } from './useSettingsForm'
import { copy } from './copy'

export const FORM_ID = 'settings-form'
const TAB_BASE = 'settings-tab'

/** 入力の本体。食い違い・控え・誤りのまとめ・区分・中身・保存の知らせを縦に並べる。保存中は欄を止める。 */
export function SettingsFormView({ form }: { form: SettingsForm }) {
  const Panel = PANELS[form.tab]
  return (
    <form id={FORM_ID} ref={form.formRef} noValidate onSubmit={(e) => { e.preventDefault(); form.submit() }} onClickCapture={form.onJump} className="flex flex-col gap-6">
      {form.conflict && <ConflictPanel conflict={form.conflict} values={form.values} saving={form.saving} onTheirs={form.takeTheirs} onOverwrite={form.overwrite} />}
      {form.backup && <BackupNotice onRestore={form.restoreMine} />}
      <ErrorSummary errors={form.errorList} />
      <Tabs label={copy.tabsLabel} items={TABS.map((t) => ({ id: t.id, label: t.label }))} value={form.tab} onChange={(id) => form.setTab(TABS.find((t) => t.id === id)?.id ?? TABS[0].id)} idBase={TAB_BASE} disabled={form.saving} />
      <div {...tabPanelProps(TAB_BASE, form.tab)}>
        <Panel form={form} />
      </div>
      <SaveStatus failed={form.failed} dirty={form.dirty} saving={form.saving} />
    </form>
  )
}
