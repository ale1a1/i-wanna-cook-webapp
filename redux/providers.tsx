"use client"

import type React from "react"
import { useEffect } from "react"
import { Provider } from "react-redux"
import { store } from "./store"
import { login } from "./features/auth/authSlice"
import { useTheme } from "next-themes"

function SessionRestorer() {
  const { setTheme } = useTheme()

  useEffect(() => {
    const saved = localStorage.getItem("user")
    if (!saved) return
    try {
      const user = JSON.parse(saved)
      if (user.id && user.email && user.username) {
        store.dispatch(login({
          id: user.id,
          email: user.email,
          username: user.username,
          theme: user.theme ?? "system",
          accessToken: user.accessToken ?? undefined,
        }))
        if (user.theme && setTheme) setTheme(user.theme)
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SessionRestorer />
      {children}
    </Provider>
  )
}
