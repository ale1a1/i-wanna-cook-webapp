import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../../store"

interface User {
  id: string
  email: string
  username: string
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
    login: (state, action: PayloadAction<{ id: string; email: string; username: string }>) => {
      state.user = {
        id: action.payload.id,
        email: action.payload.email,
        username: action.payload.username,
      }
      state.isAuthenticated = true
    },
    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { login, logout } = authSlice.actions
export const selectAuth = (state: RootState) => state.auth
export default authSlice.reducer
