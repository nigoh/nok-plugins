/**
 * 郵便番号から住所を探す真似（通信はしない）。実在の番号と一致しない見本の表で、返す形は本物にしたときも同じ：
 * 住所の配列（0 件＝当たらない、2 件以上＝複数）、時間切れは例外。取得先を替えるときは lookupZip だけを替える。
 */
export const ZIP_TABLE: Record<string, string[]> = {
  '0600042': ['北海道札幌市中央区大通西'],
  '0600061': ['北海道札幌市中央区南1条西'],
  '0620020': ['北海道札幌市豊平区月寒中央通'],
  '0640804': ['北海道札幌市中央区南4条西'],
  '0650013': ['北海道札幌市東区北13条東'],
  '0640941': ['北海道札幌市中央区旭ケ丘', '北海道札幌市中央区宮の森'],
}

/** この番号は時間切れを返す（確かめ用）。 */
export const TIMEOUT_ZIP = '9999999'
/** 探す待ち。0.3 秒を少し超える長さにして、待ちの文が出る様子を確かめられるようにする。 */
export const ZIP_MS = 400

export const digitsOf = (s: string) => s.replace(/\D/g, '')

export function lookupZip(zip: string): Promise<string[]> {
  const d = digitsOf(zip)
  return new Promise((resolve, reject) => {
    window.setTimeout(() => (d === TIMEOUT_ZIP ? reject(new Error('timeout')) : resolve(ZIP_TABLE[d] ?? [])), ZIP_MS)
  })
}

/** 保存された 1 つの住所を、町名までと番地・建物に分ける（表に無ければ全部を住所に）。 */
export function splitAddress(zip: string, address: string): { address: string; street: string } {
  for (const town of ZIP_TABLE[digitsOf(zip)] ?? []) {
    if (address.startsWith(town)) return { address: town, street: address.slice(town.length).trim() }
  }
  return { address, street: '' }
}
