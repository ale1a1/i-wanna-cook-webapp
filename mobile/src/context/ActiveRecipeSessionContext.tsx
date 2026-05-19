import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { apiFetch } from "../lib/api"
import { useAuth } from "./AuthContext"

export type Substitution = { original: string; name?: string; substitute: string; display?: string }

export type ActiveSession = {
  recipeId: string
  recipeTitle: string
  recipeData: any
  substitutions: Substitution[]
  source: "scan" | "search"
}

type ContextType = {
  session: ActiveSession | null
  quickListCount: number
  saveSession: (s: ActiveSession) => Promise<void>
  clearSession: () => Promise<void>
  refreshQuickListCount: () => Promise<void>
}

const ActiveRecipeSessionContext = createContext<ContextType>({
  session: null,
  quickListCount: 0,
  saveSession: async () => {},
  clearSession: async () => {},
  refreshQuickListCount: async () => {},
})

export function ActiveRecipeSessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [session, setSession] = useState<ActiveSession | null>(null)
  const [quickListCount, setQuickListCount] = useState(0)

  const refreshQuickListCount = useCallback(async () => {
    if (!user) { setQuickListCount(0); return }
    try {
      const res = await apiFetch(`/api/quick-shopping-list?userId=${user.id}`)
      const data = await res.json()
      setQuickListCount((data.items || []).filter((i: any) => !i.checked).length)
    } catch { setQuickListCount(0) }
  }, [user])

  const loadSession = useCallback(async () => {
    if (!user) { setSession(null); return }
    try {
      const res = await apiFetch(`/api/active-recipe-session?userId=${user.id}`)
      const data = await res.json()
      if (data.session) {
        setSession({
          recipeId: data.session.recipe_id,
          recipeTitle: data.session.recipe_title,
          recipeData: data.session.recipe_data,
          substitutions: data.session.substitutions || [],
          source: data.session.source ?? "scan",
        })
      } else {
        setSession(null)
      }
    } catch { setSession(null) }
  }, [user])

  useEffect(() => {
    loadSession()
    refreshQuickListCount()
  }, [user])

  const saveSession = useCallback(async (s: ActiveSession) => {
    setSession(s)
    if (!user) return
    await apiFetch("/api/active-recipe-session", {
      method: "POST",
      body: JSON.stringify({
        userId: user.id,
        recipeId: s.recipeId,
        recipeTitle: s.recipeTitle,
        recipeData: s.recipeData,
        substitutions: s.substitutions,
        source: s.source,
      }),
    })
  }, [user])

  const clearSession = useCallback(async () => {
    setSession(null)
    if (!user) return
    await apiFetch("/api/active-recipe-session", { method: "DELETE", body: JSON.stringify({ userId: user.id }) })
  }, [user])

  return (
    <ActiveRecipeSessionContext.Provider value={{ session, quickListCount, saveSession, clearSession, refreshQuickListCount }}>
      {children}
    </ActiveRecipeSessionContext.Provider>
  )
}

export function useActiveRecipeSession() {
  return useContext(ActiveRecipeSessionContext)
}
