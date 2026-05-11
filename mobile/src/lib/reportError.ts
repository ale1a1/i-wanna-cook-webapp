import { Platform } from "react-native"
import { apiFetch } from "./api"

let lastReportTime = 0
const COOLDOWN_MS = 5 * 60 * 1000

export async function reportError(error: string, screen?: string): Promise<"sent" | "cooldown" | "failed"> {
  const now = Date.now()
  if (now - lastReportTime < COOLDOWN_MS) return "cooldown"
  lastReportTime = now
  try {
    await apiFetch("/api/report-error", {
      method: "POST",
      body: JSON.stringify({ error, screen, platform: Platform.OS }),
    })
    return "sent"
  } catch {
    return "failed"
  }
}
