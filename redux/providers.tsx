"use client"

import type React from "react"
import { useEffect } from "react"
import { Provider } from "react-redux"
import { store } from "./store"
import { login } from "./features/auth/authSlice"

function SessionRestorer() {
  useEffect(() => {
    const saved = localStorage.getItem("user")
    if (saved) {
      try {
        const user = JSON.parse(saved)
        if (user.id && user.email && user.username) {
          store.dispatch(login(user))
        }
      } catch { /* ignore */ }
    }
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
