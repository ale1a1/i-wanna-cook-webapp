import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../../store"

interface User {
  username: string
  preferences?: {
    diet?: string
    allergies?: string[]
    favoriteCuisines?: string[]
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
}

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ username: string }>) => {
      state.user = {
        username: action.payload.username,
        preferences: {
          diet: "none",
          allergies: [],
          favoriteCuisines: ["Italian", "Mexican"],
        },
      }
      state.isAuthenticated = true
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
    },
    updatePreferences: (
      state,
      action: PayloadAction<{
        diet?: string
        allergies?: string[]
        favoriteCuisines?: string[]
      }>,
    ) => {
      if (state.user) {
        state.user.preferences = {
          ...state.user.preferences,
          ...action.payload,
        }
      }
    },
  },
})

export const { login, logout, updatePreferences } = authSlice.actions

export const selectAuth = (state: RootState) => state.auth

export default authSlice.reducer
