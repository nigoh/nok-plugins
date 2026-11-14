/**
 * 請求書の一覧にしか出ない文（L-13）。全画面で同じ語（画面名・ボタンの動詞・待ちと知らせの文）は app/terms から引く。
 * 文は連結せず差し込む。
 */
export const copy = {
  loadFailed: '請求書の一覧を読み込めませんでした。しばらくしてから、もう一度読み込んでください。',
  /** 更新中に止める操作の理由（RefreshingNote の続き）。 */
  refreshingLock: '並べ替えとページ送りは、終わるまで変えられません',
  empty: { title: '請求書はまだありません', link: '最初の請求書を作る', afterLink: 'と、ここに並びます。' },
  filteredEmpty: { title: '条件に合う請求書はありません', description: '条件を外すと、ほかの請求書が見つかります。' },
  clearAll: '条件をすべて外す',
  count: (n: string, note: string) => `全${n}件・${note}`,
  chipStatus: (label: string) => `状況：${label}`,
  chipQuery: (word: string) => `「${word}」で探す`,
  chipOff: (chip: string) => `${chip}の条件を外す`,
  noNumber: '番号は送ると付きます',
  rowOf: (number: string | null) => (number ? `の請求書${number}` : 'の請求書（番号なし）'),
} as const
