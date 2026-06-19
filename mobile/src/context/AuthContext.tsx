import React, { createContext, useContext, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AppState, AppStateStatus } from "react-native"

type User = {
  id: string
  email: string
  username: string
  accessToken?: string
  trialExpiresAt?: string | null
  trialActive?: boolean
  isPremium?: boolean
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (user: User) => Promise<void>
  logout: () => Promise<void>
  trialActive: boolean
  isPremium: boolean
  daysLeftInTrial: number
}

function computeTrialActive(trialExpiresAt?: string | null): boolean {
  if (!trialExpiresAt) return false
  return new Date() < new Date(trialExpiresAt)
}

function computeDaysLeft(trialExpiresAt?: string | null): number {
  if (!trialExpiresAt) return 0
  return Math.max(0, Math.ceil((new Date(trialExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  trialActive: false,
  isPremium: false,
  daysLeftInTrial: 0,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    AsyncStorage.getItem("user").then((val) => {
      if (val) setUser(JSON.parse(val))
      setLoading(false)
    })
  }, [])

  // Recompute trial status when app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") setNow(Date.now())
    })
    return () => sub.remove()
  }, [])

  const login = async (u: User) => {
    setUser(u)
    await AsyncStorage.setItem("user", JSON.stringify(u))
  }

  const logout = async () => {
    setUser(null)
    await AsyncStorage.removeItem("user")
  }

  // Recompute trialActive from the expiry timestamp so it goes false the moment trial ends,
  // even if the user hasn't logged out and back in.
  const trialActive = computeTrialActive(user?.trialExpiresAt)
  // isPremium: paid subscribers keep their server value; trial users lose it when trial expires.
  const isPremium = user?.isPremium === true && (trialActive || !user?.trialExpiresAt)
  const daysLeftInTrial = computeDaysLeft(user?.trialExpiresAt)

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, trialActive, isPremium, daysLeftInTrial }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
