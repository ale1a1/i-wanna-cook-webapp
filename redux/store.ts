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

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: true,
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
