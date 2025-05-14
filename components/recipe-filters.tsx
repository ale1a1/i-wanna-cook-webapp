"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAppDispatch, useAppSelector } from "@/redux/hooks"
import {
  updatePrepTime,
  updateBudget,
  updateDiet,
  updateTaste,
  addIngredient,
  removeIngredient,
  resetFilters,
  applyFilters,
  selectFilters,
  selectHasActiveFilters,
} from "@/redux/features/filters/filtersSlice"
import { filterRecipes, resetFiltersApplied } from "@/redux/features/recipes/recipesSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Clock, DollarSign, Utensils, Coffee, ShoppingBag, RefreshCw, X } from "lucide-react"
import { mockIngredients } from "@/lib/mock-data"

export default function RecipeFilters() {
  const dispatch = useAppDispatch()
  const filters = useAppSelector(selectFilters)
  const hasActiveFilters = useAppSelector(selectHasActiveFilters)
  const [ingredientInput, setIngredientInput] = useState("")
  const [suggestedIngredients, setSuggestedIngredients] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Filter ingredients based on input
    if (ingredientInput.trim()) {
      const filtered = mockIngredients
        .filter((ingredient) => ingredient.toLowerCase().includes(ingredientInput.toLowerCase()))
        .slice(0, 5) // Limit to 5 suggestions
      setSuggestedIngredients(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setSuggestedIngredients([])
      setShowSuggestions(false)
    }
  }, [ingredientInput])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleAddIngredient = (ingredient: string = ingredientInput) => {
    if (ingredient.trim()) {
      dispatch(addIngredient(ingredient.trim()))
      setIngredientInput("")
      setShowSuggestions(false)
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

  const handleClearAll = () => {
    // Only clear the applied filters, not resetting the form
    dispatch(resetFiltersApplied())
  }

  const handleApplyFilters = () => {
    dispatch(applyFilters())
    dispatch(filterRecipes(filters))
  }

  const handleSurpriseMe = () => {
    // Reset filters first
    dispatch(resetFilters())

    // Then apply a random filter
    const randomRecipeIndex = Math.floor(Math.random() * mockIngredients.length)
    const randomIngredient = mockIngredients[randomRecipeIndex]

    dispatch(addIngredient(randomIngredient))
    setTimeout(() => {
      dispatch(applyFilters())
      dispatch(filterRecipes({ ...filters, ingredients: [randomIngredient] }))
    }, 100)
  }

  return (
    <div className="bg-card rounded-lg border p-4 space-y-6">
      <div className="border-l-4 border-primary pl-3 font-semibold">Filter Recipes</div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <Clock className="h-4 w-4 mr-2 text-primary" />
            Prep Time
          </label>
          <Select value={filters.prepTime} onValueChange={(value) => dispatch(updatePrepTime(value))}>
            <SelectTrigger>
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

        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <DollarSign className="h-4 w-4 mr-2 text-primary" />
            Budget
          </label>
          <Select value={filters.budget} onValueChange={(value) => dispatch(updateBudget(value))}>
            <SelectTrigger>
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

        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <Utensils className="h-4 w-4 mr-2 text-primary" />
            Diet
          </label>
          <Select value={filters.diet} onValueChange={(value) => dispatch(updateDiet(value))}>
            <SelectTrigger>
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

        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <Coffee className="h-4 w-4 mr-2 text-primary" />
            Taste
          </label>
          <Select value={filters.taste} onValueChange={(value) => dispatch(updateTaste(value))}>
            <SelectTrigger>
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

        <div className="space-y-2">
          <label className="flex items-center text-sm font-medium">
            <ShoppingBag className="h-4 w-4 mr-2 text-primary" />
            Ingredients
          </label>
          <div className="relative">
            <Input
              placeholder="Search ingredients..."
              value={ingredientInput}
              onChange={(e) => setIngredientInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(suggestedIngredients.length > 0)}
            />

            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg max-h-60 overflow-auto"
              >
                {suggestedIngredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 hover:bg-muted cursor-pointer"
                    onClick={() => handleAddIngredient(ingredient)}
                  >
                    {ingredient}
                  </div>
                ))}
              </div>
            )}
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
        </div>
      </div>

      <div className="space-y-2">
        <Button className="w-full" onClick={handleApplyFilters} disabled={!hasActiveFilters}>
          Apply Filters
        </Button>

        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={handleResetForm} className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-1" />
            Reset Form
          </Button>

          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            <X className="h-4 w-4 mr-1" />
            Clear Results
          </Button>
        </div>
      </div>

      <Button variant="secondary" className="w-full flex items-center justify-center" onClick={handleSurpriseMe}>
        <span className="mr-2">Surprise Me!</span>
        <span className="text-lg">✨</span>
      </Button>
    </div>
  )
}
