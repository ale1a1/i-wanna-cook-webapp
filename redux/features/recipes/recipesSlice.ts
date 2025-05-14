import { createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../../store"
import { mockRecipes, getFilteredRecipes } from "@/lib/mock-data"

interface Recipe {
  id: number
  title: string
  image: string
  readyInMinutes: number
  servings: number
  summary: string
  extendedIngredients: any[]
  analyzedInstructions: any[]
  // Add other properties as needed
}

interface TriedRecipe {
  id: string
  title: string
  triedOn: string
  satisfaction?: number
  timeAccuracy?: number
  difficulty?: string
  estimatedTime?: number
}

interface SearchHistory {
  id: string
  timestamp: number
  filters: any
  recipes: Recipe[] // Store actual recipes instead of just count
}

interface RecipesState {
  recipes: Recipe[]
  filteredRecipes: Recipe[]
  triedRecipes: TriedRecipe[]
  filtersApplied: boolean
  searchHistory: SearchHistory[]
}

// Load tried recipes from localStorage if available
const loadTriedRecipes = (): TriedRecipe[] => {
  if (typeof window !== "undefined") {
    const savedTriedRecipes = localStorage.getItem("triedRecipes")
    if (savedTriedRecipes) {
      try {
        return JSON.parse(savedTriedRecipes)
      } catch (e) {
        console.error("Failed to parse saved tried recipes")
      }
    }
  }

  // Sample data if nothing in localStorage
  return [
    {
      id: "1",
      title: "Creamy Mushroom Pasta",
      triedOn: "01/04/2024",
      satisfaction: 4,
      timeAccuracy: 5,
      difficulty: "Easy",
      estimatedTime: 25,
    },
    {
      id: "2",
      title: "Vegan Chili Bowl",
      triedOn: "08/04/2024",
      satisfaction: 5,
      timeAccuracy: 4,
      difficulty: "Very Easy",
      estimatedTime: 40,
    },
    {
      id: "3",
      title: "Mediterranean Quinoa Bowl",
      triedOn: "15/04/2024",
    },
    {
      id: "4",
      title: "Spicy Thai Noodles",
      triedOn: "20/04/2024",
    },
  ]
}

// Load search history from localStorage if available
const loadSearchHistory = (): SearchHistory[] => {
  if (typeof window !== "undefined") {
    const savedHistory = localStorage.getItem("searchHistory")
    if (savedHistory) {
      try {
        return JSON.parse(savedHistory)
      } catch (e) {
        console.error("Failed to parse saved search history")
      }
    }
  }
  return []
}

const initialState: RecipesState = {
  recipes: mockRecipes,
  filteredRecipes: [],
  triedRecipes: loadTriedRecipes(),
  filtersApplied: false,
  searchHistory: loadSearchHistory(),
}

export const recipesSlice = createSlice({
  name: "recipes",
  initialState,
  reducers: {
    setRecipes: (state, action: PayloadAction<Recipe[]>) => {
      state.recipes = action.payload
    },
    setFilteredRecipes: (state, action: PayloadAction<Recipe[]>) => {
      state.filteredRecipes = action.payload
      state.filtersApplied = true
    },
    filterRecipes: (state, action: PayloadAction<any>) => {
      const filteredResults = getFilteredRecipes(action.payload)
      state.filteredRecipes = filteredResults
      state.filtersApplied = true

      // Add to search history with actual recipes
      const searchId = Date.now().toString()
      const newSearch: SearchHistory = {
        id: searchId,
        timestamp: Date.now(),
        filters: { ...action.payload },
        recipes: filteredResults.slice(0, 4), // Store up to 4 recipes per search
      }

      // Add to beginning of array and limit to 5 items
      state.searchHistory = [newSearch, ...state.searchHistory].slice(0, 5)

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("searchHistory", JSON.stringify(state.searchHistory))
      }
    },
    addTriedRecipe: (state, action: PayloadAction<TriedRecipe>) => {
      // Check if recipe already exists
      const existingIndex = state.triedRecipes.findIndex((recipe) => recipe.id === action.payload.id)

      if (existingIndex >= 0) {
        // Update existing recipe
        state.triedRecipes[existingIndex] = {
          ...state.triedRecipes[existingIndex],
          ...action.payload,
        }
      } else {
        // Add new recipe
        state.triedRecipes.push(action.payload)
      }

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("triedRecipes", JSON.stringify(state.triedRecipes))
      }
    },
    updateTriedRecipe: (
      state,
      action: PayloadAction<{
        id: string
        satisfaction?: number
        timeAccuracy?: number
        difficulty?: string
      }>,
    ) => {
      const { id, ...updates } = action.payload
      const recipeIndex = state.triedRecipes.findIndex((r) => r.id === id)

      if (recipeIndex >= 0) {
        state.triedRecipes[recipeIndex] = {
          ...state.triedRecipes[recipeIndex],
          ...updates,
        }

        // Save to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("triedRecipes", JSON.stringify(state.triedRecipes))
        }
      }
    },
    removeTriedRecipe: (state, action: PayloadAction<string>) => {
      state.triedRecipes = state.triedRecipes.filter((recipe) => recipe.id !== action.payload)

      // Save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("triedRecipes", JSON.stringify(state.triedRecipes))
      }
    },
    resetFiltersApplied: (state) => {
      state.filtersApplied = false
    },
    clearSearchHistory: (state) => {
      state.searchHistory = []
      if (typeof window !== "undefined") {
        localStorage.removeItem("searchHistory")
      }
    },
    searchAgain: (state, action: PayloadAction<string>) => {
      const searchId = action.payload
      const searchItem = state.searchHistory.find((item) => item.id === searchId)

      if (searchItem) {
        state.filteredRecipes = searchItem.recipes
        state.filtersApplied = true
      }
    },
  },
})

export const {
  setRecipes,
  setFilteredRecipes,
  filterRecipes,
  addTriedRecipe,
  updateTriedRecipe,
  removeTriedRecipe,
  resetFiltersApplied,
  clearSearchHistory,
  searchAgain,
} = recipesSlice.actions

export const selectRecipes = (state: RootState) => state.recipes.recipes
export const selectFilteredRecipes = (state: RootState) => state.recipes.filteredRecipes
export const selectTriedRecipes = (state: RootState) => state.recipes.triedRecipes
export const selectFiltersApplied = (state: RootState) => state.recipes.filtersApplied
export const selectSearchHistory = (state: RootState) => state.recipes.searchHistory

export default recipesSlice.reducer
