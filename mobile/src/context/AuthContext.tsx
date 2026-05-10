import React, { createContext, useContext, useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"

type User = {
  id: string
  email: string
  username: string
  accessToken?: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (user: User) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    AsyncStorage.getItem("user").then((val) => {
      if (val) setUser(JSON.parse(val))
      setLoading(false)
    })
  }, [])

  const login = async (u: User) => {
    setUser(u)
    await AsyncStorage.setItem("user", JSON.stringify(u))
  }

  const logout = async () => {
    setUser(null)
    await AsyncStorage.removeItem("user")
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
