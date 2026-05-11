import { Platform } from "react-native"
import { apiFetch } from "./api"

// Track reported errors by fingerprint (screen + message) so each unique error
// can be reported once, but a different error on the same screen is reportable again
const reportedFingerprints = new Set<string>()

export function getErrorFingerprint(error: string, screen: string): string {
  return `${screen}::${error.slice(0, 120)}`
}

export function wasReported(fingerprint: string): boolean {
  return reportedFingerprints.has(fingerprint)
}

export function clearReported(fingerprint: string): void {
  reportedFingerprints.delete(fingerprint)
}

export async function reportError(
  error: string,
  screen: string,
  fingerprint: string
): Promise<"sent" | "already_reported" | "failed"> {
  if (reportedFingerprints.has(fingerprint)) return "already_reported"
  try {
    const res = await apiFetch("/api/report-error", {
      method: "POST",
      body: JSON.stringify({ error, screen, platform: Platform.OS }),
    })
    // Mark as reported regardless of server rate-limit response —
    // the server got it (or it was a duplicate on the server side)
    reportedFingerprints.add(fingerprint)
    return "sent"
  } catch {
    return "failed"
  }
}
