// Error reporting is now handled automatically inside apiFetch.
// This file is kept for any direct (non-apiFetch) error reporting needs.
import { Platform } from "react-native"
import { apiFetch } from "./api"

export async function reportError(error: string, screen: string): Promise<void> {
  try {
    await apiFetch("/api/report-error", {
      method: "POST",
      body: JSON.stringify({ error, screen, platform: Platform.OS }),
    })
  } catch {}
}
