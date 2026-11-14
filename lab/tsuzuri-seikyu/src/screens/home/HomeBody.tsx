import { NOW, TODAY } from '../../data'
import { ActivitySection } from './ActivitySection'
import { MetricsSection } from './MetricsSection'
import { ACTIVITY_LIMIT, metricsOf, recentEvents, todoOf, type HomeData } from './summary'
import { TodoSection } from './TodoSection'

/**
 * 3 つの区画を DOM の順（今日やること → 数字 → 最近の動き）に置く。1024px 以上は 2 列の格子で、
 * 自動配置のまま左→右・上→下に並ぶ（order や列の指定で入れ替えない：S-10）。
 */
export function HomeBody({ data }: { data: HomeData }) {
  return (
    <div className="grid gap-8 md:gap-12 lg:grid-cols-2">
      <TodoSection facts={todoOf(data, TODAY)} />
      <MetricsSection metrics={metricsOf(data.invoices, TODAY)} />
      <ActivitySection events={recentEvents(data, NOW, ACTIVITY_LIMIT)} />
    </div>
  )
}
