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

interface RecipesState {
  recipes: Recipe[]
  filteredRecipes: Recipe[]
  triedRecipes: TriedRecipe[]
  filtersApplied: boolean
  loading: boolean
  loadingMore: boolean
  error: string | null
  currentOffset: number
  hasMore: boolean
  currentFilters: FiltersState | null
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
      return { results: data.results as Recipe[], totalResults: data.totalResults as number }
    } catch (err) {
      return rejectWithValue("Network error")
    }
  }
)

export const loadMoreRecipes = createAsyncThunk(
  "recipes/loadMoreRecipes",
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState
    const { currentOffset, currentFilters } = state.recipes
    if (!currentFilters) return rejectWithValue("No filters")
    try {
      const params = buildSearchParams(currentFilters)
      params.set("offset", String(currentOffset))
      const res = await fetch(`/api/recipes/search?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json()
        return rejectWithValue(err.error || "Failed to fetch recipes")
      }
      const data = await res.json()
      return { results: data.results as Recipe[], totalResults: data.totalResults as number }
    } catch (err) {
      return rejectWithValue("Network error")
    }
  }
)

const initialState: RecipesState = {
  recipes: [],
  filteredRecipes: [],
  triedRecipes: [],
  filtersApplied: false,
  loading: false,
  loadingMore: false,
  error: null,
  currentOffset: 0,
  hasMore: false,
  currentFilters: null,
}

export const recipesSlice = createSlice({
  name: "recipes",
  initialState,
  reducers: {
    setRecipes: (state, action: PayloadAction<Recipe[]>) => {
      state.recipes = action.payload
    },
    setTriedRecipes: (state, action: PayloadAction<TriedRecipe[]>) => {
      state.triedRecipes = action.payload
    },
    addTriedRecipe: (state, action: PayloadAction<TriedRecipe>) => {
      const existingIndex = state.triedRecipes.findIndex((r) => r.id === action.payload.id)
      if (existingIndex >= 0) {
        state.triedRecipes[existingIndex] = { ...state.triedRecipes[existingIndex], ...action.payload }
      } else {
        state.triedRecipes.push(action.payload)
      }
    },
    updateTriedRecipe: (state, action: PayloadAction<{ id: string; satisfaction?: number; timeAccuracy?: number; difficulty?: string }>) => {
      const { id, ...updates } = action.payload
      const idx = state.triedRecipes.findIndex((r) => r.id === id)
      if (idx >= 0) {
        state.triedRecipes[idx] = { ...state.triedRecipes[idx], ...updates }
      }
    },
    removeTriedRecipe: (state, action: PayloadAction<string>) => {
      state.triedRecipes = state.triedRecipes.filter((r) => r.id !== action.payload)
    },
    resetFiltersApplied: (state) => {
      state.filtersApplied = false
      state.filteredRecipes = []
      state.error = null
      state.currentOffset = 0
      state.hasMore = false
      state.currentFilters = null
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
        state.filteredRecipes = action.payload.results
        state.filtersApplied = true
        state.currentOffset = action.payload.results.length
        state.hasMore = action.payload.results.length < action.payload.totalResults
        state.currentFilters = action.meta.arg
      })
      .addCase(fetchRecipes.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(loadMoreRecipes.pending, (state) => {
        state.loadingMore = true
      })
      .addCase(loadMoreRecipes.fulfilled, (state, action) => {
        state.loadingMore = false
        state.filteredRecipes = [...state.filteredRecipes, ...action.payload.results]
        state.currentOffset = state.filteredRecipes.length
        state.hasMore = state.filteredRecipes.length < action.payload.totalResults
      })
      .addCase(loadMoreRecipes.rejected, (state) => {
        state.loadingMore = false
      })
  },
})

export const {
  setRecipes,
  setTriedRecipes,
  addTriedRecipe,
  updateTriedRecipe,
  removeTriedRecipe,
  resetFiltersApplied,
} = recipesSlice.actions

export const selectRecipes = (state: RootState) => state.recipes.recipes
export const selectFilteredRecipes = (state: RootState) => state.recipes.filteredRecipes
export const selectTriedRecipes = (state: RootState) => state.recipes.triedRecipes
export const selectFiltersApplied = (state: RootState) => state.recipes.filtersApplied
export const selectRecipesLoading = (state: RootState) => state.recipes.loading
export const selectRecipesLoadingMore = (state: RootState) => state.recipes.loadingMore
export const selectRecipesError = (state: RootState) => state.recipes.error
export const selectHasMore = (state: RootState) => state.recipes.hasMore

export default recipesSlice.reducer
