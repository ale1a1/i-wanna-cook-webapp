import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import type { RootState } from "../../store"
import type { FiltersState } from "../filters/filtersSlice"

export interface Recipe {
  id: number
  title: string
  image: string
  readyInMinutes: number
  servings: number
  summary: string
  extendedIngredients: any[]
  analyzedInstructions: any[]
  diets?: string[]
  cuisines?: string[]
  healthScore?: number
  pricePerServing?: number
  vegan?: boolean
  vegetarian?: boolean
  glutenFree?: boolean
  dairyFree?: boolean
  veryHealthy?: boolean
  cheap?: boolean
  nutrition?: any
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
  recipes: Recipe[]
}

interface RecipesState {
  recipes: Recipe[]
  filteredRecipes: Recipe[]
  triedRecipes: TriedRecipe[]
  filtersApplied: boolean
  searchHistory: SearchHistory[]
  loading: boolean
  error: string | null
}

const loadTriedRecipes = (): TriedRecipe[] => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("triedRecipes")
    if (saved) {
      try { return JSON.parse(saved) } catch { /* ignore */ }
    }
  }
  return [
    { id: "1", title: "Creamy Mushroom Pasta", triedOn: "01/04/2024", satisfaction: 4, timeAccuracy: 5, difficulty: "Easy", estimatedTime: 25 },
    { id: "2", title: "Vegan Chili Bowl", triedOn: "08/04/2024", satisfaction: 5, timeAccuracy: 4, difficulty: "Very Easy", estimatedTime: 40 },
    { id: "3", title: "Mediterranean Quinoa Bowl", triedOn: "15/04/2024" },
    { id: "4", title: "Spicy Thai Noodles", triedOn: "20/04/2024" },
  ]
}

const loadSearchHistory = (): SearchHistory[] => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("searchHistory")
    if (saved) {
      try { return JSON.parse(saved) } catch { /* ignore */ }
    }
  }
  return []
}

// Map our filter state to Spoonacular API query params
function buildSearchParams(filters: FiltersState): URLSearchParams {
  const params = new URLSearchParams()

  // Prep time
  switch (filters.prepTime) {
    case "under15": params.set("maxReadyTime", "15"); break
    case "under30": params.set("maxReadyTime", "30"); break
    case "under60": params.set("maxReadyTime", "60"); break
    case "over60": params.set("minReadyTime", "60"); break
  }

  // Diet
  const dietMap: Record<string, string> = {
    vegetarian: "vegetarian",
    vegan: "vegan",
    glutenFree: "gluten free",
    keto: "ketogenic",
    paleo: "paleo",
  }
  if (filters.diet !== "any" && dietMap[filters.diet]) {
    params.set("diet", dietMap[filters.diet])
  }

  // Cuisine
  if (filters.cuisine !== "any") {
    params.set("cuisine", filters.cuisine)
  }

  // Budget (price per serving in cents)
  switch (filters.budget) {
    case "cheap": params.set("maxPricePerServing", "150"); break
    case "moderate": params.set("minPricePerServing", "150"); params.set("maxPricePerServing", "300"); break
    case "expensive": params.set("minPricePerServing", "300"); break
  }

  // Healthiness
  switch (filters.healthiness) {
    case "healthy": params.set("minHealthScore", "60"); break
    case "veryHealthy": params.set("minHealthScore", "80"); break
    case "indulgent": params.set("maxHealthScore", "30"); break
  }

  // Taste
  switch (filters.taste) {
    case "sweet": params.set("minSweetness", "60"); break
    case "salty": params.set("minSaltiness", "60"); break
    case "spicy": params.set("minSpiciness", "40"); break
    case "savory": params.set("minSavoriness", "60"); break
  }

  // Ingredients
  if (filters.ingredients.length > 0) {
    params.set("includeIngredients", filters.ingredients.join(","))
  }

  return params
}

export const fetchRecipes = createAsyncThunk(
  "recipes/fetchRecipes",
  async (filters: FiltersState, { rejectWithValue }) => {
    try {
      const params = buildSearchParams(filters)
      const res = await fetch(`/api/recipes/search?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        return rejectWithValue(err.error || "Failed to fetch recipes")
      }
      const data = await res.json()
      return data.results as Recipe[]
    } catch (err) {
      return rejectWithValue("Network error")
    }
  }
)

const initialState: RecipesState = {
  recipes: [],
  filteredRecipes: [],
  triedRecipes: loadTriedRecipes(),
  filtersApplied: false,
  searchHistory: loadSearchHistory(),
  loading: false,
  error: null,
}

export const recipesSlice = createSlice({
  name: "recipes",
  initialState,
  reducers: {
    setRecipes: (state, action: PayloadAction<Recipe[]>) => {
      state.recipes = action.payload
    },
    addTriedRecipe: (state, action: PayloadAction<TriedRecipe>) => {
      const existingIndex = state.triedRecipes.findIndex((r) => r.id === action.payload.id)
      if (existingIndex >= 0) {
        state.triedRecipes[existingIndex] = { ...state.triedRecipes[existingIndex], ...action.payload }
      } else {
        state.triedRecipes.push(action.payload)
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("triedRecipes", JSON.stringify(state.triedRecipes))
      }
    },
    updateTriedRecipe: (state, action: PayloadAction<{ id: string; satisfaction?: number; timeAccuracy?: number; difficulty?: string }>) => {
      const { id, ...updates } = action.payload
      const idx = state.triedRecipes.findIndex((r) => r.id === id)
      if (idx >= 0) {
        state.triedRecipes[idx] = { ...state.triedRecipes[idx], ...updates }
        if (typeof window !== "undefined") {
          localStorage.setItem("triedRecipes", JSON.stringify(state.triedRecipes))
        }
      }
    },
    removeTriedRecipe: (state, action: PayloadAction<string>) => {
      state.triedRecipes = state.triedRecipes.filter((r) => r.id !== action.payload)
      if (typeof window !== "undefined") {
        localStorage.setItem("triedRecipes", JSON.stringify(state.triedRecipes))
      }
    },
    resetFiltersApplied: (state) => {
      state.filtersApplied = false
      state.filteredRecipes = []
      state.error = null
    },
    clearSearchHistory: (state) => {
      state.searchHistory = []
      if (typeof window !== "undefined") {
        localStorage.removeItem("searchHistory")
      }
    },
    searchAgain: (state, action: PayloadAction<string>) => {
      const searchItem = state.searchHistory.find((item) => item.id === action.payload)
      if (searchItem) {
        state.filteredRecipes = searchItem.recipes
        state.filtersApplied = true
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecipes.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchRecipes.fulfilled, (state, action) => {
        state.loading = false
        state.filteredRecipes = action.payload
        state.filtersApplied = true

        const newSearch: SearchHistory = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          filters: {},
          recipes: action.payload.slice(0, 4),
        }
        state.searchHistory = [newSearch, ...state.searchHistory].slice(0, 5)
        if (typeof window !== "undefined") {
          localStorage.setItem("searchHistory", JSON.stringify(state.searchHistory))
        }
      })
      .addCase(fetchRecipes.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const {
  setRecipes,
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
export const selectRecipesLoading = (state: RootState) => state.recipes.loading
export const selectRecipesError = (state: RootState) => state.recipes.error

export default recipesSlice.reducer
