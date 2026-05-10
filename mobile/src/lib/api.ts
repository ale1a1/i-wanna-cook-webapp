import Constants from "expo-constants"

export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ?? "https://main.d1fv3pyedpdjxn.amplifyapp.com"

export async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  })
  return res
}
