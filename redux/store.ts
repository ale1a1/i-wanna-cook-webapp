import { configureStore } from "@reduxjs/toolkit"
import { combineReducers } from "redux"
import filtersReducer from "./features/filters/filtersSlice"
import recipesReducer from "./features/recipes/recipesSlice"
import authReducer from "./features/auth/authSlice"

const rootReducer = combineReducers({
  filters: filtersReducer,
  recipes: recipesReducer,
  auth: authReducer,
})

function loadAuthFromStorage() {
  if (typeof window === "undefined") return undefined
  try {
    const saved = localStorage.getItem("user")
    if (!saved) return undefined
    const user = JSON.parse(saved)
    if (user.id && user.email && user.username) {
      return {
        auth: {
          user: { id: user.id, email: user.email, username: user.username, theme: user.theme ?? "system" },
          isAuthenticated: true,
          accessToken: user.accessToken ?? null,
        },
      }
    }
  } catch { /* ignore */ }
  return undefined
}

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: loadAuthFromStorage(),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: true,
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
