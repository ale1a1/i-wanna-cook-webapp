"use client"

import { useAppSelector, useAppDispatch } from "@/redux/hooks"
import {
  selectFilteredRecipes,
  selectFiltersApplied,
  selectRecipesLoading,
  selectRecipesLoadingMore,
  selectRecipesError,
  selectHasMore,
  loadMoreRecipes,
} from "@/redux/features/recipes/recipesSlice"
import { selectFilters } from "@/redux/features/filters/filtersSlice"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Clock, Users, Loader2, AlertCircle, ChevronDown } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

const FILTER_LABELS: Record<string, Record<string, string>> = {
  prepTime: { under15: "Under 15 min", under30: "Under 30 min", under60: "Under 1 hour", over60: "Over 1 hour" },
  budget: { cheap: "Budget-friendly", moderate: "Moderate", expensive: "Premium" },
  diet: { vegetarian: "Vegetarian", vegan: "Vegan", glutenFree: "Gluten-free", keto: "Keto", paleo: "Paleo" },
  taste: { sweet: "Sweet", salty: "Salty", spicy: "Spicy", savory: "Savory" },
  healthiness: { healthy: "Healthy", veryHealthy: "Very Healthy", indulgent: "Indulgent" },
  cuisine: {},
}

export default function RecipeResults() {
  const recipes = useAppSelector(selectFilteredRecipes)
  const filtersApplied = useAppSelector(selectFiltersApplied)
  const filters = useAppSelector(selectFilters)
  const loading = useAppSelector(selectRecipesLoading)
  const loadingMore = useAppSelector(selectRecipesLoadingMore)
  const error = useAppSelector(selectRecipesError)
  const hasMore = useAppSelector(selectHasMore)
  const dispatch = useAppDispatch()

  const activeFilterLabels = [
    ...["prepTime", "budget", "diet", "taste", "healthiness"].flatMap((key) => {
      const val = filters[key as keyof typeof filters] as string
      if (val === "any") return []
      return [FILTER_LABELS[key][val] ?? val]
    }),
    ...(filters.cuisine !== "any" ? [filters.cuisine.charAt(0).toUpperCase() + filters.cuisine.slice(1)] : []),
    ...filters.ingredients.map((i) => i),
  ]

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ""
  }

  const RecipeCard = ({ recipe }: { recipe: any }) => (
    <Card className="overflow-hidden border-2 border-border hover:border-primary/40 transition-colors flex flex-col">
      <div className="relative h-48 w-full flex-shrink-0">
        <Image src={recipe.image || "/placeholder.svg"} alt={recipe.title} fill style={{ objectFit: "cover" }} />
      </div>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="line-clamp-2">{recipe.title}</CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            <span>{recipe.readyInMinutes} min</span>
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>{recipe.servings} servings</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1">
        {recipe.summary && (
          <p className="text-sm text-muted-foreground line-clamp-3">{stripHtml(recipe.summary)}</p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Link href={`/recipe/${recipe.id}`} className="w-full">
          <Button className="w-full">View Recipe</Button>
        </Link>
      </CardFooter>
    </Card>
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Recipe Results</h2>
        <Card className="min-h-[400px] flex items-center justify-center">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Finding your perfect recipes...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Recipe Results</h2>
        <Card className="min-h-[200px] flex items-center justify-center border-destructive">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <p className="text-lg font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div id="recipe-results" className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Recipe Results</h2>
        {filtersApplied && activeFilterLabels.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
            <span className="text-sm font-medium text-primary">Filters active:</span>
            {activeFilterLabels.map((label) => (
              <Badge key={label} className="bg-primary text-primary-foreground hover:bg-primary/90">{label}</Badge>
            ))}
          </div>
        ) : !filtersApplied ? null : (
          <p className="text-sm text-muted-foreground">
            Adjust the filters to find exactly what you're looking for.
          </p>
        )}
      </div>

      {filtersApplied ? (
        recipes.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => dispatch(loadMoreRecipes())} disabled={loadingMore} className="min-w-[160px]">
                  {loadingMore ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading...</>
                  ) : (
                    <><ChevronDown className="h-4 w-4 mr-2" />Load More</>
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Card className="min-h-[400px] flex items-center justify-center">
            <CardContent className="p-6 text-center">
              <p className="text-lg font-medium">No recipes match your criteria</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters to see more results</p>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="min-h-[400px] flex items-center justify-center">
          <CardContent className="p-6 text-center">
            <div className="bg-muted rounded-full p-6 mb-4 inline-flex">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">Select filters to find recipes</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Choose at least one filter on the left, then hit Apply Filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
