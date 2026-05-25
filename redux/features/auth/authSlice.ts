import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../../store"

interface User {
  id: string
  email: string
  username: string
  theme: string
  subscriptionTier: string
  trialExpiresAt: string | null
  trialActive: boolean
  isPremium: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  accessToken: string | null
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  accessToken: null,
}

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ id: string; email: string; username: string; theme: string; accessToken?: string; subscriptionTier?: string; trialExpiresAt?: string | null; trialActive?: boolean; isPremium?: boolean }>) => {
      state.user = {
        id: action.payload.id,
        email: action.payload.email,
        username: action.payload.username,
        theme: action.payload.theme ?? "system",
        subscriptionTier: action.payload.subscriptionTier ?? "free",
        trialExpiresAt: action.payload.trialExpiresAt ?? null,
        trialActive: action.payload.trialActive ?? false,
        isPremium: action.payload.isPremium ?? false,
      }
      state.isAuthenticated = true
      state.accessToken = action.payload.accessToken ?? null
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.accessToken = null
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    },
  },
})

export const { login, logout, updateUser } = authSlice.actions
export const selectAuth = (state: RootState) => state.auth
export default authSlice.reducer
