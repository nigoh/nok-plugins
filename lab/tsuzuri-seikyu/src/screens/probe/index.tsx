import { useState, type ReactNode } from 'react'
import { AppShell } from '../../app/AppShell'
import { Link } from '../../app/Link'
import { actions, screenNames } from '../../app/terms'
import { LinkButton } from '../../app/LinkButton'
import type { ScreenDef } from '../../app/types'
import { clients, displayStatus, invoices, invoiceTotal, makeManyInvoices, TODAY, useFake, formatDate, formatTime, clientOf, type Invoice } from '../../data'
import { DataTable, InvoiceStatusTag, invoiceStatusDef, PaymentStatusTag, tagDensityOf, type Column } from '../../parts'
import {
  Button, Card, Checkbox, Dialog, EmptyState, ErrorState, Field, IconButton, Money, Notice, Pagination, Segmented,
  Select, Skeleton, Stepper, StatusTag, Switch, Tabs, tabPanelProps, Textarea, TextInput, useToast, type StatusTone, type TagDensity,
} from '../../ui'

/** 骨格の確かめ用の見本。AppShell と基本の部品を全部並べる。製品の画面ではない（screens.yaml には載せない）。 */
const STATES = ['default', 'loading', 'error', 'empty', 'many', 'filtered_empty', 'refreshing', 'stale'] as const

const tones: StatusTone[] = ['wait', 'progress', 'fail', 'done', 'calm', 'draft']
const toneLabel: Record<StatusTone, string> = { wait: '確認待ち', progress: '作業中', fail: '失敗', done: '済み', calm: '一区切り', draft: '下書き' }

/** 札の見え方は、いま見えている行の調子から決める（color-state.md C-08）。 */
const columnsFor = (density: (t: StatusTone) => TagDensity): Column<Invoice>[] => [
  { key: 'no', header: '請求書番号', main: true, width: 'md', render: (i) => i.number ?? '（番号は送るときに付きます）' },
  { key: 'client', header: screenNames.clients, render: (i) => clientOf(i.clientId, clients)?.name ?? '' },
  { key: 'due', header: '支払期限', width: 'md', render: (i) => formatDate(i.dueOn) },
  { key: 'status', header: '状況', width: 'md', render: (i) => { const st = displayStatus(i, TODAY); return <InvoiceStatusTag status={st} density={density(invoiceStatusDef[st].tone)} /> } },
  { key: 'total', header: '金額（円）', align: 'end', width: 'md', render: (i) => <Money value={invoiceTotal(i)} unit={false} /> },
]

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-large font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Probe({ state }: { state: string }) {
  const toast = useToast()
  const fake = useFake(state, (s) => (s === 'many' ? makeManyInvoices(240) : invoices))
  const [tab, setTab] = useState('all')
  const [seg, setSeg] = useState('month')
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const shown = fake.kind === 'ready' || fake.kind === 'refreshing' || fake.kind === 'stale' ? fake.data : null
  const rows = shown ? shown.slice((page - 1) * 20, page * 20) : []
  const columns = columnsFor(tagDensityOf(rows.map((i) => invoiceStatusDef[displayStatus(i, TODAY)].tone)))
  return (
    <AppShell
      data-scr="SCR-000" state={state} states={STATES} title="部品の見本" current={null} kind="view"
      description="骨格と基本の部品を並べた確かめ用の画面です。"
      primary={<Button variant="primary" onClick={() => toast.show({ message: '保存しました', tone: 'ok', action: { label: actions.undo, onAction: () => {} } })}>{actions.save}</Button>}
      secondary={<Button>{actions.cancel}</Button>}
      back={{ to: 'home', label: screenNames.home }}
    >
      <Block title="ボタン">
        <div className="flex flex-col items-start gap-2 md:flex-row">
          <Button variant="primary">主のボタン</Button>
          <Button>ふつうのボタン</Button>
          <Button variant="quiet">静かなボタン</Button>
        </div>
        <div className="flex flex-col items-start gap-2 md:flex-row">
          <Button variant="danger">取り消す</Button>
          <Button disabled>押せないボタン</Button>
          <Button variant="primary" busy={busy} busyLabel="保存しています" onClick={() => { setBusy(true); window.setTimeout(() => setBusy(false), 1500) }}>{actions.save}</Button>
        </div>
        <div className="flex flex-col items-start gap-2 md:flex-row md:items-center">
          <IconButton label="検索" icon="search" variant="secondary" />
          <LinkButton to="invoices" leading="chevron-right">請求書へ</LinkButton>
          <Link to="clients">取引先へ</Link>
        </div>
      </Block>
      <Block title="札と知らせ">
        <div className="flex flex-wrap gap-2">
          {tones.map((t) => <StatusTag key={t} tone={t}>{toneLabel[t]}</StatusTag>)}
          <InvoiceStatusTag status="overdue" />
          <PaymentStatusTag status="diff" />
        </div>
        <div className="flex flex-col gap-2">
          <Notice tone="info" title="お知らせ">請求書は送ると番号が付きます。</Notice>
          <Notice tone="warn">期限を過ぎた請求書が3件あります。</Notice>
          <Notice tone="fail" title="送れませんでした" action={<Button>もう一度送る</Button>}>メールアドレスを確かめてください。</Notice>
          <Notice tone="ok">入金を記録しました。</Notice>
        </div>
      </Block>
      <Block title="入力">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="取引先名" hint="請求書にそのまま載ります。" required>{(p) => <TextInput {...p} defaultValue="株式会社北斗印刷" />}</Field>
          <Field label="郵便番号" error="郵便番号は7桁の数字で入力してください。">{(p) => <TextInput {...p} defaultValue="06-0042" leading="〒" inputMode="numeric" />}</Field>
          <Field label="単価">{(p) => <TextInput {...p} defaultValue="12000" align="end" trailing="円" inputMode="numeric" />}</Field>
          <Field label="税の端数">{(p) => <Select {...p} options={[{ value: 'floor', label: '切り捨て' }, { value: 'round', label: '四捨五入' }, { value: 'ceil', label: '切り上げ' }]} />}</Field>
          <Field label="備考" className="md:col-span-2">{(p) => <Textarea {...p} defaultValue="お支払いは月末までにお願いします。" />}</Field>
          <Field label="期間" group>{() => <Segmented label="期間" value={seg} onChange={setSeg} options={[{ value: 'month', label: '月' }, { value: 'quarter', label: '四半期' }, { value: 'year', label: '年' }]} />}</Field>
          <div className="flex flex-col">
            <Checkbox label="送ったら控えをメールで受け取る" defaultChecked />
            <Switch label="入金があったら知らせる" defaultChecked />
          </div>
        </div>
      </Block>
      <Block title="金額・面・手順">
        <div className="grid gap-6 md:grid-cols-2">
          <Card><p className="text-body text-muted">今月の請求額</p><Money value={1457500} size="display" /></Card>
          <Card selected><p className="text-body">選んでいる面</p><Money value={-330} signed size="large" /></Card>
          <Card><p className="text-body text-muted">取れていない月</p><Money value={null} size="large" /></Card>
        </div>
        <Stepper label="はじめての設定の進み具合" steps={['自社の情報', '請求の決まり', '最初の取引先']} current={2} />
      </Block>
      <Block title="一覧と待ち・空・失敗の見せ方">
        <Tabs idBase="probe" label="請求書の状況" value={tab} onChange={setTab} items={[{ id: 'all', label: 'すべて', count: 34 }, { id: 'draft', label: '下書き', count: 2 }, { id: 'sent', label: '送付済み', count: 9 }, { id: 'overdue', label: '期限超過', count: 3 }, { id: 'paid', label: '入金済み', count: 20 }]} />
        <div {...tabPanelProps('probe', tab)} className="flex flex-col gap-4">
          {fake.kind === 'loading' && <Skeleton lines={5} />}
          {fake.kind === 'empty' && fake.state === 'empty' && <EmptyState title="請求書はまだありません" description="最初の請求書を作ると、ここに並びます。" action={<LinkButton to="invoice-new" variant="primary">{actions.createInvoice}</LinkButton>} />}
          {fake.kind === 'empty' && fake.state === 'filtered_empty' && <EmptyState title="条件に合う請求書はありません" description="条件を外すと、ほかの請求書が見つかります。" action={<Button>条件をすべて外す</Button>} />}
          {fake.kind === 'error' && <ErrorState description={fake.message} onRetry={fake.retry} retrying={fake.retrying} />}
          {fake.kind === 'stale' && (
            <Notice tone="warn" title={`${formatTime(fake.asOf)}時点の内容です`} action={<Button busy={fake.retrying} busyLabel="読み込んでいます" onClick={fake.retry}>{actions.retry}</Button>}>更新できませんでした。もう一度読み込んでください。</Notice>
          )}
          {fake.kind === 'refreshing' && <p role="status" className="text-body text-muted">更新しています</p>}
          {shown && (
            <>
              <DataTable label="請求書の一覧" columns={columns} rows={rows} rowKey={(i) => i.id} />
              <Pagination page={page} pageSize={20} total={shown.length} onChange={setPage} />
            </>
          )}
        </div>
      </Block>
      <Block title="窓">
        <div><Button onClick={() => setOpen(true)}>窓を開く</Button></div>
        <Dialog open={open} onClose={() => setOpen(false)} title="請求書を取り消しますか" secondary={<Button onClick={() => setOpen(false)}>{actions.cancel}</Button>} primary={<Button variant="danger" onClick={() => setOpen(false)}>{actions.voidInvoice}</Button>}>
          取り消すと、この請求書は入金の確認の候補から外れます。取り消した請求書は元に戻せません。
        </Dialog>
      </Block>
    </AppShell>
  )
}

export const screen: ScreenDef = { id: 'SCR-000', slug: 'probe', title: '部品の見本', kind: 'view', states: [...STATES], Component: Probe }
