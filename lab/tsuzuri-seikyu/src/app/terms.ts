/**
 * 呼び名の正本（.konomi/screens.yaml の terms と同じ内容）。画面の文言のうち、全画面で同じでなければならないものだけをここに置く
 * （画面名・メニュー・状況の語・ボタンの動詞。words.md L-13）。ここにある語は必ずここから引き、画面に直書きしない。
 * 画面にしか出ない文（題・説明・空の文・誤りの文）は画面ファイルに置いてよい。連結せず、差し込む（M-21）。
 * 避ける言い方（terms の avoid）は書かない。
 */
export const screenNames = {
  home: 'ホーム',
  invoices: '請求書',
  'invoice-new': '請求書の作成',
  'invoice-detail': '請求書の詳細',
  clients: '取引先',
  'client-form': '取引先の登録',
  payments: '入金の確認',
  report: '売上レポート',
  settings: '設定',
  setup: 'はじめての設定',
} as const

export type ScreenSlug = keyof typeof screenNames

/** 上のメニューの項目と並び（全画面で同じ）。 */
export const navItems = [
  { key: 'home', slug: 'home' },
  { key: 'invoices', slug: 'invoices' },
  { key: 'clients', slug: 'clients' },
  { key: 'payments', slug: 'payments' },
  { key: 'report', slug: 'report' },
  { key: 'settings', slug: 'settings' },
] as const satisfies ReadonlyArray<{ key: string; slug: ScreenSlug }>

export type NavKey = (typeof navItems)[number]['key']

/**
 * ボタンの文言。押すと何が起きるかを言う。同じ操作は最後まで同じ名前。
 * 型：「対象を＋動詞（〜する／〜る）」の言い切り。3〜9 字。「…」「！」・句点を付けない（words.md L-03・L-10）。
 * 窓の題は「請求書を取り消しますか」のように、主ボタンと同じ動詞にする（L-05）。
 */
export const actions = {
  createInvoice: '請求書を作る',
  saveDraft: '下書きを保存する',
  reviewInvoice: '内容を確かめる',
  sendInvoice: '請求書を送る',
  recordPayment: '入金を記録する',
  voidInvoice: '請求書を取り消す',
  createClient: '取引先を登録する',
  editClient: '取引先を編集する',
  save: '保存する',
  cancel: 'やめる',
  close: '閉じる',
  retry: 'もう一度読み込む',
  undo: '元に戻す',
  exportTable: '表を書き出す',
  // --- 第3回の振り返りで画面から引き上げた物（2 画面以上で同じ動詞を直書きしていた）。画面は第 2 段で引くようにする ---
  /** 段のある入力（はじめての設定）で次の段へ。 */
  next: '次へ進む',
  /** 段のある入力で前の段へ。 */
  prev: '前の段へ戻る',
  /** 離れる窓の「戻る」。決定 9：「編集に戻る」「やめる」にしない。 */
  backToInput: '入力に戻る',
  discardAndLeave: '保存せず離れる',
  saveAndLeave: '保存して離れる',
  deleteDraft: '下書きを削除する',
  /** 競合の窓：相手が先に更新したとき、相手の内容に替える／自分の内容で上書きする。 */
  useTheirs: '相手の内容を使う',
  overwriteSave: '上書きして保存する',
} as const

/**
 * 画面にしか出ない文ではなく、全画面で同じでなければならない「待ち・知らせ」の文。画面は引くだけ。差し込みは関数。
 * 型：待ちは「〜しています」、済んだ知らせは「〜しました」（20 字以内、句点なし）。誤りは「何が起きたか＋どう直すか」。
 */
export const messages = {
  saving: '保存しています',
  loading: '読み込んでいます',
  /** 更新中（refreshing）。前のデータを残したまま、この 1 文を表の上に出す。操作を止めるときは理由を続ける（children）。 */
  refreshing: '更新しています',
  /** 古い内容（stale）の題。asOf は formatTime の結果。 */
  staleTitle: (time: string) => `${time}時点の内容です`,
  staleBody: '更新できませんでした。もう一度読み込んでください。',
  /** 欄を離れた時に全角などを直したときの知らせ（F-06）。 */
  widened: '半角にそろえました',
  saveFailed: '保存できませんでした。入力は残っています。もう一度保存してください。',
  /** 離れる窓（AppShell の LeaveDialog）。 */
  leave: {
    title: '保存して離れますか',
    titlePlain: '入力を消して離れますか',
    body: '入力した内容は、まだ保存されていません。保存せずに離れると、内容は消えます。',
  },
} as const

export const appName = 'つづり請求'
