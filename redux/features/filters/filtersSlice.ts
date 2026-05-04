import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../../store"

export interface FiltersState {
  prepTime: string
  budget: string
  diet: string
  taste: string
  healthiness: string
  cuisine: string
  ingredients: string[]
  applied: boolean
  hasActiveFilters: boolean
}

const initialState: FiltersState = {
  prepTime: "any",
  budget: "any",
  diet: "any",
  taste: "any",
  healthiness: "any",
  cuisine: "any",
  ingredients: [],
  applied: false,
  hasActiveFilters: false,
}

export const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    updatePrepTime: (state, action: PayloadAction<string>) => {
      state.prepTime = action.payload
      state.hasActiveFilters = checkHasActiveFilters(state)
    },
    updateBudget: (state, action: PayloadAction<string>) => {
      state.budget = action.payload
      state.hasActiveFilters = checkHasActiveFilters(state)
    },
    updateDiet: (state, action: PayloadAction<string>) => {
      state.diet = action.payload
      state.hasActiveFilters = checkHasActiveFilters(state)
    },
    updateTaste: (state, action: PayloadAction<string>) => {
      state.taste = action.payload
      state.hasActiveFilters = checkHasActiveFilters(state)
    },
    updateHealthiness: (state, action: PayloadAction<string>) => {
      state.healthiness = action.payload
      state.hasActiveFilters = checkHasActiveFilters(state)
    },
    updateCuisine: (state, action: PayloadAction<string>) => {
      state.cuisine = action.payload
      state.hasActiveFilters = checkHasActiveFilters(state)
    },
    addIngredient: (state, action: PayloadAction<string>) => {
      if (!state.ingredients.includes(action.payload)) {
        state.ingredients.push(action.payload)
        state.hasActiveFilters = checkHasActiveFilters(state)
      }
    },
    removeIngredient: (state, action: PayloadAction<string>) => {
      state.ingredients = state.ingredients.filter((ingredient) => ingredient !== action.payload)
      state.hasActiveFilters = checkHasActiveFilters(state)
    },
    resetFilters: () => initialState,
    applyFilters: (state) => {
      state.applied = true
    },
  },
})

const checkHasActiveFilters = (state: FiltersState): boolean => {
  return (
    state.prepTime !== "any" ||
    state.budget !== "any" ||
    state.diet !== "any" ||
    state.taste !== "any" ||
    state.healthiness !== "any" ||
    state.cuisine !== "any" ||
    state.ingredients.length > 0
  )
}

export const {
  updatePrepTime,
  updateBudget,
  updateDiet,
  updateTaste,
  updateHealthiness,
  updateCuisine,
  addIngredient,
  removeIngredient,
  resetFilters,
  applyFilters,
} = filtersSlice.actions

export const selectFilters = (state: RootState) => state.filters
export const selectHasActiveFilters = (state: RootState) => state.filters.hasActiveFilters

export default filtersSlice.reducer
