import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import Purchases, { CustomerInfo, LOG_LEVEL } from "react-native-purchases"
import { useAuth } from "./AuthContext"
import { API_BASE_URL } from "../lib/api"

const REVENUECAT_ANDROID_KEY = "your_revenuecat_android_key_here"
export const PREMIUM_ENTITLEMENT = "premium"

type SubscriptionContextType = {
  isPremium: boolean
  isLoading: boolean
  customerInfo: CustomerInfo | null
  restorePurchases: () => Promise<void>
  purchasePremium: () => Promise<boolean>
  checkSubscription: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  isLoading: true,
  customerInfo: null,
  restorePurchases: async () => {},
  purchasePremium: async () => false,
  checkSubscription: async () => {},
})

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isPremium, setIsPremium] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)

  const syncToBackend = useCallback(async (info: CustomerInfo) => {
    if (!user?.id) return
    const entitlement = info.entitlements.active[PREMIUM_ENTITLEMENT]
    const tier = entitlement ? "premium" : "free"
    const expiresAt = entitlement?.expirationDate ?? null
    try {
      await fetch(`${API_BASE_URL}/api/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, tier, expiresAt }),
      })
    } catch {}
  }, [user?.id])

  const checkSubscription = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo()
      setCustomerInfo(info)
      const premium = !!info.entitlements.active[PREMIUM_ENTITLEMENT]
      setIsPremium(premium)
      await syncToBackend(info)
    } catch {} finally {
      setIsLoading(false)
    }
  }, [syncToBackend])

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.ERROR)
    Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY })
    if (user?.id) Purchases.logIn(user.id)
    checkSubscription()
  }, [user?.id])

  const purchasePremium = useCallback(async (): Promise<boolean> => {
    try {
      const offerings = await Purchases.getOfferings()
      const pkg = offerings.current?.availablePackages[0]
      if (!pkg) return false
      const { customerInfo: info } = await Purchases.purchasePackage(pkg)
      setCustomerInfo(info)
      const premium = !!info.entitlements.active[PREMIUM_ENTITLEMENT]
      setIsPremium(premium)
      await syncToBackend(info)
      return premium
    } catch {
      return false
    }
  }, [syncToBackend])

  const restorePurchases = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases()
      setCustomerInfo(info)
      const premium = !!info.entitlements.active[PREMIUM_ENTITLEMENT]
      setIsPremium(premium)
      await syncToBackend(info)
    } catch {}
  }, [syncToBackend])

  return (
    <SubscriptionContext.Provider value={{ isPremium, isLoading, customerInfo, purchasePremium, restorePurchases, checkSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => useContext(SubscriptionContext)
