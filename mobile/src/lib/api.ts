import Constants from "expo-constants"
import { Platform } from "react-native"

export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ?? "https://main.d1fv3pyedpdjxn.amplifyapp.com"

// Tracks fingerprints already reported this session to avoid duplicate emails
const reportedFingerprints = new Set<string>()

async function silentlyReportError(error: string, screen: string) {
  const fingerprint = `${screen}::${error.slice(0, 120)}`
  if (reportedFingerprints.has(fingerprint)) return
  reportedFingerprints.add(fingerprint)
  try {
    await fetch(`${API_BASE_URL}/api/report-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error, screen, platform: Platform.OS }),
    })
  } catch {}
}

export async function apiFetch(
  path: string,
  options?: RequestInit & { screen?: string }
): Promise<Response> {
  const { screen, ...fetchOptions } = options ?? {}
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(fetchOptions?.headers ?? {}),
    },
  })

  if (!res.ok) {
    // Clone so caller can still read the body
    const cloned = res.clone()
    let errorDetail = `HTTP ${res.status}`
    try {
      const data = await cloned.json()
      errorDetail = data?.error ? `[${res.status}] ${data.error}` : `[${res.status}]`
    } catch {}
    const screenName = screen ?? pathToScreenName(path)
    silentlyReportError(errorDetail, screenName)
  }

  return res
}

function pathToScreenName(path: string): string {
  const segment = path.split("?")[0].replace("/api/", "")
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
}
