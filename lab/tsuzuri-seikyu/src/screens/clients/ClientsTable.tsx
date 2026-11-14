import { describeTerms, daysUntil, formatDateColumn, MISSING, TODAY } from '../../data'
import { Link } from '../../app/Link'
import { DataTable, type Column } from '../../parts'
import { Money } from '../../ui'
import { copy, editSuffix, otherContacts, unpaidNotes } from './copy'
import type { ClientRow } from './model'

/** 「・」で区切った塊ごとに、塊の間だけで折り返す（「払」と「い」を泣き別れにしない：D-09）。 */
function Chunks({ parts, className }: { parts: string[]; className?: string }) {
  return (
    <span className={className}>
      {parts.map((t, i) => (
        <span key={i} className="inline-block whitespace-nowrap">{t}{i < parts.length - 1 ? '・' : ''}</span>
      ))}
    </span>
  )
}

/**
 * 取引先の表。列と列幅、担当者・支払条件・未入金の言い方だけを知っている（取得も並べ方も知らない）。
 * 列の順は 探すもの → 担当者 → 条件 → 金額（右端）（G-04）。幅が足りないときの行の形は DataTable が決める（D-13）。
 */
export function ClientsTable({ rows }: { rows: ClientRow[] }) {
  // 同じ列に今年以外の期限が 1 件でもあれば、全行を長い形にそろえる（G-07）
  const dues = rows.flatMap((r) => (r.earliestDue ? [r.earliestDue] : []))
  const dueText = new Map(formatDateColumn(dues, TODAY).map((text, i) => [dues[i], text]))

  const columns: Column<ClientRow>[] = [
    {
      key: 'name', header: '取引先名', main: true,
      render: (r) => (
        <Link to="client-form" params={{ id: r.client.id }}>
          {r.client.name}
          <span className="sr-only">{editSuffix}</span>
        </Link>
      ),
    },
    {
      key: 'contact', header: '担当者', width: 'sm',
      render: (r) => {
        const [first, ...others] = r.client.contacts
        if (!first) return <>{MISSING}<span className="sr-only">データなし</span></>
        return (
          <span className="flex flex-col">
            <span>{first.name}</span>
            {first.section && <span className="text-muted">{first.section}</span>}
            {others.length > 0 && <span className="text-muted">{otherContacts(others.length)}</span>}
          </span>
        )
      },
    },
    {
      key: 'terms', header: '締め日と支払期限', width: 'md',
      render: (r) => <Chunks parts={describeTerms(r.client.terms).split('・')} />,
    },
    {
      key: 'unpaid', header: '未入金額（税込・円）', width: 'lg', align: 'end',
      render: (r) => (
        <span className="flex flex-col items-end">
          <Money value={r.unpaid} unit={false} />
          {r.unpaidCount > 0 && r.earliestDue && (
            <Chunks
              className="text-right text-muted"
              parts={unpaidNotes({ count: r.unpaidCount, due: dueText.get(r.earliestDue) ?? r.earliestDue, days: daysUntil(r.earliestDue, TODAY) })}
            />
          )}
        </span>
      ),
    },
  ]
  return <DataTable label={copy.tableLabel} columns={columns} rows={rows} rowKey={(r) => r.client.id} />
}

