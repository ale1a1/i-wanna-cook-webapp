import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { useAuth } from "./AuthContext"
import { API_BASE_URL } from "../lib/api"

type SubscriptionContextType = {
  isPremium: boolean
  isLoading: boolean
  checkSubscription: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  isLoading: true,
  checkSubscription: async () => {},
})

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isPremium, setIsPremium] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkSubscription = useCallback(async () => {
    if (!user?.id) { setIsLoading(false); return }
    try {
      const res = await fetch(`${API_BASE_URL}/api/subscription?userId=${user.id}`)
      const data = await res.json()
      setIsPremium(data.tier === "premium")
    } catch {
      setIsPremium(false)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    checkSubscription()
  }, [user?.id])

  return (
    <SubscriptionContext.Provider value={{ isPremium, isLoading, checkSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
