import AsyncStorage from "@react-native-async-storage/async-storage"

const SEARCH_LIMIT = 10
const SCAN_LIMIT = 3

function weekStartKey(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split("T")[0]
}

async function getCount(key: string): Promise<number> {
  const raw = await AsyncStorage.getItem(key)
  if (!raw) return 0
  try {
    const parsed = JSON.parse(raw)
    return parsed.week === weekStartKey() ? parsed.count : 0
  } catch { return 0 }
}

async function increment(key: string) {
  const count = await getCount(key)
  await AsyncStorage.setItem(key, JSON.stringify({ count: count + 1, week: weekStartKey() }))
}

export type LimitCheck =
  | { allowed: true; used: number; limit: number; commit: () => Promise<void> }
  | { allowed: false; used: number; limit: number }

async function check(storageKey: string, limit: number): Promise<LimitCheck> {
  const count = await getCount(storageKey)
  if (count >= limit) return { allowed: false, used: count, limit }
  return {
    allowed: true,
    used: count + 1,
    limit,
    commit: () => increment(storageKey),
  }
}

export async function checkGuestSearch(): Promise<LimitCheck> {
  return check("guest_search_usage", SEARCH_LIMIT)
}

export async function checkGuestScan(): Promise<LimitCheck> {
  return check("guest_scan_usage", SCAN_LIMIT)
}
