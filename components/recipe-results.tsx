"use client"

import { useAppSelector, useAppDispatch } from "@/redux/hooks"
import {
  selectFilteredRecipes,
  selectFiltersApplied,
  selectSearchHistory,
  selectRecipesLoading,
  selectRecipesError,
  clearSearchHistory,
} from "@/redux/features/recipes/recipesSlice"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Clock, Users, History, Trash2, Loader2, AlertCircle } from "lucide-react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

export default function RecipeResults() {
  const recipes = useAppSelector(selectFilteredRecipes)
  const filtersApplied = useAppSelector(selectFiltersApplied)
  const searchHistory = useAppSelector(selectSearchHistory)
  const loading = useAppSelector(selectRecipesLoading)
  const error = useAppSelector(selectRecipesError)
  const dispatch = useAppDispatch()

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ""
  }

  const RecipeCard = ({ recipe }: { recipe: any }) => (
    <Card className="overflow-hidden">
      <div className="relative h-48 w-full">
        <Image src={recipe.image || "/placeholder.svg"} alt={recipe.title} fill style={{ objectFit: "cover" }} />
      </div>
      <CardHeader className="p-4">
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
      {recipe.summary && (
        <CardContent className="p-4 pt-0">
          <p className="text-sm text-muted-foreground line-clamp-3">{stripHtml(recipe.summary)}</p>
          {recipe.extendedIngredients?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.extendedIngredients.slice(0, 5).map((ingredient: any, index: number) => (
                <span key={index} className="text-xs bg-muted px-2 py-1 rounded-full">
                  {ingredient.name}
                </span>
              ))}
              {recipe.extendedIngredients.length > 5 && (
                <span className="text-xs bg-muted px-2 py-1 rounded-full">
                  +{recipe.extendedIngredients.length - 5} more
                </span>
              )}
            </div>
          )}
        </CardContent>
      )}
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
        <div>
          <h2 className="text-2xl font-bold">Recipe Results</h2>
          <p className="text-sm text-muted-foreground">Searching Spoonacular for recipes...</p>
        </div>
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
        <div>
          <h2 className="text-2xl font-bold">Recipe Results</h2>
        </div>
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
      <div>
        <h2 className="text-2xl font-bold">Recipe Results</h2>
        <p className="text-sm text-muted-foreground">
          Showing recipes that match your filter criteria. Adjust the filters to find exactly what you're looking for.
        </p>
      </div>

      {filtersApplied ? (
        recipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
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
        <Card className="min-h-[400px]">
          <CardContent className="p-6">
            {searchHistory.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <History className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="text-lg font-medium">Recently Viewed Recipes</h3>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dispatch(clearSearchHistory())}
                    className="flex items-center"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear History
                  </Button>
                </div>

                {searchHistory.map((search) => (
                  <div key={search.id} className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(search.timestamp, { addSuffix: true })}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {search.recipes.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                      ))}
                    </div>
                    <div className="border-b my-6"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <div className="bg-muted rounded-full p-6 mb-4">
                  <Search className="h-12 w-12 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium">No search performed yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md text-center">
                  Use the filters on the left to find recipes that match your preferences, or try the "Surprise Me"
                  button for a random suggestion.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
