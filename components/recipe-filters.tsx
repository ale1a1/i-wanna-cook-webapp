"use client"

import type React from "react"

import { useState } from "react"
import { useAppDispatch, useAppSelector } from "@/redux/hooks"
import {
  updatePrepTime,
  updateBudget,
  updateDiet,
  updateTaste,
  updateHealthiness,
  updateCuisine,
  addIngredient,
  removeIngredient,
  toggleIntolerance,
  updateMealType,
  addExcludeIngredient,
  removeExcludeIngredient,
  resetFilters,
  applyFilters,
  selectFilters,
  selectHasActiveFilters,
} from "@/redux/features/filters/filtersSlice"
import { fetchRecipes, resetFiltersApplied, selectFiltersApplied } from "@/redux/features/recipes/recipesSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Clock, DollarSign, Utensils, Coffee, ShoppingBag, RefreshCw, X, Globe, Heart, AlertTriangle, UtensilsCrossed, Ban } from "lucide-react"

const INTOLERANCES = ["Dairy", "Egg", "Gluten", "Grain", "Peanut", "Seafood", "Sesame", "Shellfish", "Soy", "Sulfite", "Tree Nut", "Wheat"]

const MEAL_TYPES = [
  "main course", "side dish", "dessert", "appetizer", "salad", "bread",
  "breakfast", "soup", "beverage", "sauce", "marinade", "fingerfood", "snack", "drink",
]

const CUISINES = [
  "African", "Asian", "American", "British", "Cajun", "Caribbean",
  "Chinese", "Eastern European", "European", "French", "German",
  "Greek", "Indian", "Irish", "Italian", "Japanese", "Jewish",
  "Korean", "Latin American", "Mediterranean", "Mexican", "Middle Eastern",
  "Nordic", "Southern", "Spanish", "Thai", "Vietnamese",
]

export default function RecipeFilters() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector(selectFilters)
  const hasActiveFilters = useAppSelector(selectHasActiveFilters)
  const filtersApplied = useAppSelector(selectFiltersApplied)
  const [ingredientInput, setIngredientInput] = useState("")
  const [excludeInput, setExcludeInput] = useState("")

  const handleAddIngredient = (ingredient: string = ingredientInput) => {
    if (ingredient.trim()) {
      dispatch(addIngredient(ingredient.trim()))
      setIngredientInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddIngredient()
    }
  }

  const handleResetForm = () => {
    dispatch(resetFilters())
    dispatch(resetFiltersApplied())
  }

  const handleApplyFilters = () => {
    dispatch(applyFilters())
    dispatch(fetchRecipes(filters))
    if (window.innerWidth < 768) {
      setTimeout(() => {
        document.getElementById("recipe-results")?.scrollIntoView({ behavior: "smooth" })
      }, 300)
    }
  }

  const handleSurpriseMe = () => {
    const randomFilters = {
      ...filters,
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
    dispatch(resetFilters())
    dispatch(fetchRecipes(randomFilters))
  }

  return (
    <div className="bg-card rounded-lg border p-4 space-y-6">
      <div className="border-l-4 border-primary pl-3 font-semibold">Filter Recipes</div>

      <div className="space-y-4">
        {/* Prep Time */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <Clock className="h-4 w-4 mr-2 text-primary" />
            Prep Time
          </label>
          <Select value={filters.prepTime} onValueChange={(value) => dispatch(updatePrepTime(value))}>
            <SelectTrigger className={filters.prepTime !== "any" ? "border-primary text-primary" : ""}>
              <SelectValue placeholder="Any time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="under15">Under 15 minutes</SelectItem>
              <SelectItem value="under30">Under 30 minutes</SelectItem>
              <SelectItem value="under60">Under 1 hour</SelectItem>
              <SelectItem value="over60">Over 1 hour</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <DollarSign className="h-4 w-4 mr-2 text-primary" />
            Budget
          </label>
          <Select value={filters.budget} onValueChange={(value) => dispatch(updateBudget(value))}>
            <SelectTrigger className={filters.budget !== "any" ? "border-primary text-primary" : ""}>
              <SelectValue placeholder="Any budget" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any budget</SelectItem>
              <SelectItem value="cheap">Budget-friendly</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="expensive">Premium ingredients</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Diet */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <Utensils className="h-4 w-4 mr-2 text-primary" />
            Diet
          </label>
          <Select value={filters.diet} onValueChange={(value) => dispatch(updateDiet(value))}>
            <SelectTrigger className={filters.diet !== "any" ? "border-primary text-primary" : ""}>
              <SelectValue placeholder="Any diet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any diet</SelectItem>
              <SelectItem value="vegetarian">Vegetarian</SelectItem>
              <SelectItem value="vegan">Vegan</SelectItem>
              <SelectItem value="glutenFree">Gluten-free</SelectItem>
              <SelectItem value="keto">Keto</SelectItem>
              <SelectItem value="paleo">Paleo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cuisine */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <Globe className="h-4 w-4 mr-2 text-primary" />
            Cuisine
          </label>
          <Select value={filters.cuisine} onValueChange={(value) => dispatch(updateCuisine(value))}>
            <SelectTrigger className={filters.cuisine !== "any" ? "border-primary text-primary" : ""}>
              <SelectValue placeholder="Any cuisine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any cuisine</SelectItem>
              {CUISINES.map((c) => (
                <SelectItem key={c} value={c.toLowerCase()}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Healthiness */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <Heart className="h-4 w-4 mr-2 text-primary" />
            Healthiness
          </label>
          <Select value={filters.healthiness} onValueChange={(value) => dispatch(updateHealthiness(value))}>
            <SelectTrigger className={filters.healthiness !== "any" ? "border-primary text-primary" : ""}>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="veryHealthy">Very Healthy</SelectItem>
              <SelectItem value="indulgent">Indulgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Taste */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <Coffee className="h-4 w-4 mr-2 text-primary" />
            Taste
          </label>
          <Select value={filters.taste} onValueChange={(value) => dispatch(updateTaste(value))}>
            <SelectTrigger className={filters.taste !== "any" ? "border-primary text-primary" : ""}>
              <SelectValue placeholder="Any taste" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any taste</SelectItem>
              <SelectItem value="sweet">Sweet</SelectItem>
              <SelectItem value="salty">Salty</SelectItem>
              <SelectItem value="spicy">Spicy</SelectItem>
              <SelectItem value="savory">Savory</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Ingredients */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <ShoppingBag className="h-4 w-4 mr-2 text-primary" />
            Ingredients
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. chicken, garlic..."
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <span className={!ingredientInput.trim() ? "cursor-not-allowed" : undefined}>
              <Button type="button" size="sm" onClick={() => handleAddIngredient()} disabled={!ingredientInput.trim()} className={!ingredientInput.trim() ? "pointer-events-none" : ""}>
                Add
              </Button>
            </span>
          </div>

          {filters.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.ingredients.map((ingredient, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {ingredient}
                  <button
                    onClick={() => dispatch(removeIngredient(ingredient))}
                    className="ml-1 rounded-full hover:bg-muted p-0.5"
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {ingredient}</span>
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {/* Meal Type */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <UtensilsCrossed className="h-4 w-4 mr-2 text-primary" />
            Meal Type
          </label>
          <Select value={filters.mealType ?? "any"} onValueChange={(value) => dispatch(updateMealType(value))}>
            <SelectTrigger className={(filters.mealType ?? "any") !== "any" ? "border-primary text-primary" : ""}>
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any type</SelectItem>
              {MEAL_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Intolerances */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <AlertTriangle className="h-4 w-4 mr-2 text-primary" />
            Intolerances
          </label>
          <div className="flex flex-wrap gap-1.5">
            {INTOLERANCES.map((item) => {
              const active = (filters.intolerances ?? []).includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => dispatch(toggleIntolerance(item))}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50"}`}
                >
                  {item}
                </button>
              )
            })}
          </div>
        </div>

        {/* Exclude Ingredients */}
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <Ban className="h-4 w-4 mr-2 text-primary" />
            Exclude Ingredients
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. mushrooms, onions..."
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (excludeInput.trim()) { dispatch(addExcludeIngredient(excludeInput.trim())); setExcludeInput("") } } }}
            />
            <span className={!excludeInput.trim() ? "cursor-not-allowed" : undefined}>
              <Button type="button" size="sm" onClick={() => { if (excludeInput.trim()) { dispatch(addExcludeIngredient(excludeInput.trim())); setExcludeInput("") } }} disabled={!excludeInput.trim()} className={!excludeInput.trim() ? "pointer-events-none" : ""}>
                Add
              </Button>
            </span>
          </div>
          {(filters.excludeIngredients ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {(filters.excludeIngredients ?? []).map((item, i) => (
                <Badge key={i} variant="secondary" className="flex items-center gap-1 bg-destructive/10 text-destructive border-destructive/20">
                  {item}
                  <button onClick={() => dispatch(removeExcludeIngredient(item))} className="ml-1 rounded-full hover:bg-muted p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

      </div>
      </div>

      <div className="space-y-2">
        <span className={!hasActiveFilters ? "cursor-not-allowed" : undefined}>
          <Button className={`w-full${!hasActiveFilters ? " pointer-events-none" : ""}`} onClick={handleApplyFilters} disabled={!hasActiveFilters}>
            Apply Filters
          </Button>
        </span>

        <span className={!hasActiveFilters && !filtersApplied ? "cursor-not-allowed" : undefined}>
          <Button variant="outline" className={`w-full flex items-center justify-center${!hasActiveFilters && !filtersApplied ? " pointer-events-none" : ""}`} onClick={handleResetForm} disabled={!hasActiveFilters && !filtersApplied}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </span>
      </div>

      <Button variant="secondary" className="w-full flex items-center justify-center" onClick={handleSurpriseMe}>
        <span className="mr-2">Surprise Me!</span>
        <span className="text-lg">✨</span>
      </Button>
    </div>
  )
}
