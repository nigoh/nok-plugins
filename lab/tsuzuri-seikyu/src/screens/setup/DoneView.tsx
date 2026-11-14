import { Link } from '../../app/Link'
import { screenNames } from '../../app/terms'
import { copy } from './copy'

/** 終わったあとにこの画面を開いたとき。終わったことと、次の一手（ホームを開く：主ボタンは骨格に渡す）。 */
export function DoneView() {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-large font-bold">{copy.doneTitle}</h2>
      <p className="text-body">{copy.doneBody}</p>
      <p className="text-body text-muted">
        住所や支払条件は、<Link to="client-form" inline>{screenNames['client-form']}</Link>から入れられます。
      </p>
    </section>
  )
}
