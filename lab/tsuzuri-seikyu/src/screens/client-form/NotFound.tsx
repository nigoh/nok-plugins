import { LinkButton } from '../../app/LinkButton'
import { EmptyState } from '../../ui'
import { copy } from './copy'

/** 存在しない id。「見つかりません」と、一覧への導線（W-06・E-10）。 */
export function NotFound() {
  return (
    <EmptyState
      title={copy.notFound.title}
      description={copy.notFound.body}
      action={<LinkButton to="clients">{copy.notFound.action}</LinkButton>}
    />
  )
}
