"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, ChefHat, ArrowLeft, Heart, Star, Bookmark, Share2, CheckCircle } from "lucide-react"
import { mockRecipes } from "@/lib/mock-data"
import { useAppSelector, useAppDispatch } from "@/redux/hooks"
import { selectAuth } from "@/redux/features/auth/authSlice"
import { addTriedRecipe, selectTriedRecipes } from "@/redux/features/recipes/recipesSlice"
import Link from "next/link"

export default function RecipeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(selectAuth)
  const triedRecipes = useAppSelector(selectTriedRecipes)
  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("ingredients")

  // Check if this recipe has been tried
  const isRecipeTried = triedRecipes.some((tried) => tried.id === params.id)

  useEffect(() => {
    // In a real app, this would be an API call
    const recipeId = Number.parseInt(params.id)
    const foundRecipe = mockRecipes.find((r) => r.id === recipeId)

    if (foundRecipe) {
      setRecipe(foundRecipe)
    }
    setLoading(false)
  }, [params.id])

  const handleGoBack = () => {
    router.back()
  }

  const handleMarkAsTried = () => {
    if (!user) {
      router.push("/login?returnUrl=" + encodeURIComponent(`/recipe/${params.id}`))
      return
    }

    if (recipe) {
      const today = new Date()
      const formattedDate = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`

      dispatch(
        addTriedRecipe({
          id: recipe.id.toString(),
          title: recipe.title,
          triedOn: formattedDate,
          estimatedTime: recipe.readyInMinutes,
        }),
      )
    }
  }

  // Function to strip HTML tags from summary
  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ""
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading recipe...</p>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={handleGoBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Recipe Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The recipe you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => router.push("/")}>Browse Recipes</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={handleGoBack} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Recipes
      </Button>

      <div className="relative rounded-lg overflow-hidden h-[300px] md:h-[400px] mb-6">
        <Image src={recipe.image || "/placeholder.svg"} alt={recipe.title} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
          <div className="p-6 text-white">
            <h1 className="text-2xl md:text-3xl font-bold">{recipe.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {recipe.diets &&
                recipe.diets.map((diet: string, index: number) => (
                  <Badge key={index} variant="outline" className="bg-black/30 text-white border-white">
                    {diet}
                  </Badge>
                ))}
              {recipe.cuisines &&
                recipe.cuisines.map((cuisine: string, index: number) => (
                  <Badge key={index} variant="outline" className="bg-black/30 text-white border-white">
                    {cuisine}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center">
            <Clock className="h-5 w-5 mr-3 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Prep Time</p>
              <p className="font-medium">{recipe.readyInMinutes} minutes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center">
            <Users className="h-5 w-5 mr-3 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Servings</p>
              <p className="font-medium">{recipe.servings} people</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center">
            <ChefHat className="h-5 w-5 mr-3 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Difficulty</p>
              <p className="font-medium">{recipe.veryHealthy ? "Intermediate" : "Easy"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between mb-8">
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-1">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Like</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-1">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-1">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>

        {isRecipeTried ? (
          <Badge variant="secondary" className="flex items-center gap-1 px-3 py-2 h-10">
            <CheckCircle className="h-4 w-4 mr-1" />
            You've Tried This Recipe
          </Badge>
        ) : (
          <div>
            <Button onClick={handleMarkAsTried}>Mark as Tried</Button>
            {!user && (
              <p className="text-xs text-muted-foreground mt-1 text-right">
                <Link href="/login" className="text-primary hover:underline">
                  Log in
                </Link>{" "}
                to mark as tried
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">About this Recipe</h2>
        <p className="text-muted-foreground">{stripHtml(recipe.summary)}</p>
      </div>

      <Tabs defaultValue="ingredients" className="mb-8" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
        </TabsList>
        <TabsContent value="ingredients" className="pt-4">
          <h3 className="text-lg font-semibold mb-4">Ingredients for {recipe.servings} servings</h3>
          <ul className="space-y-2">
            {recipe.extendedIngredients.map((ingredient: any, index: number) => (
              <li key={index} className="flex items-start gap-2 p-2 hover:bg-muted rounded-md">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {index + 1}
                </div>
                <div>
                  <span className="font-medium">{ingredient.name}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    - {ingredient.amount} {ingredient.unit}
                  </span>
                  {ingredient.original && <p className="text-sm text-muted-foreground">{ingredient.original}</p>}
                </div>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="instructions" className="pt-4">
          <h3 className="text-lg font-semibold mb-4">Cooking Instructions</h3>
          {recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0 ? (
            <ol className="space-y-6">
              {recipe.analyzedInstructions[0].steps.map((step: any, index: number) => (
                <li key={index} className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                    {step.number}
                  </div>
                  <div className="space-y-2">
                    <p>{step.step}</p>
                    {step.ingredients && step.ingredients.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Ingredients used:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {step.ingredients.map((ingredient: any, i: number) => (
                            <Badge key={i} variant="secondary">
                              {ingredient.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted-foreground">No detailed instructions available for this recipe.</p>
          )}
        </TabsContent>
        <TabsContent value="nutrition" className="pt-4">
          <h3 className="text-lg font-semibold mb-4">Nutritional Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Calories</p>
                <p className="text-xl font-bold">{Math.round(recipe.pricePerServing / 2)}</p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Protein</p>
                <p className="text-xl font-bold">{Math.round(recipe.healthScore / 5)}</p>
                <p className="text-xs text-muted-foreground">g</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Carbs</p>
                <p className="text-xl font-bold">{Math.round(recipe.healthScore / 3)}</p>
                <p className="text-xs text-muted-foreground">g</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Fat</p>
                <p className="text-xl font-bold">{Math.round(recipe.healthScore / 7)}</p>
                <p className="text-xs text-muted-foreground">g</p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6">
            <p className="text-sm text-muted-foreground italic">
              Note: Nutritional information is estimated and may vary based on specific ingredients and preparation.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="border-t pt-8 mb-8">
        <h2 className="text-xl font-bold mb-4">Reviews</h2>
        <div className="flex items-center gap-2 mb-6">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${star <= 4 ? "fill-primary text-primary" : "text-muted-foreground"}`}
              />
            ))}
          </div>
          <span className="font-medium">4.0</span>
          <span className="text-muted-foreground">(24 reviews)</span>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <div className="font-medium">Sarah Johnson</div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${star <= 5 ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Cooked on: 12/04/2024</p>
              <p>
                This recipe was amazing! The flavors were perfectly balanced and it was easy to follow. My family loved
                it and asked me to make it again next week.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between mb-2">
                <div className="font-medium">Michael Chen</div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${star <= 4 ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Cooked on: 05/04/2024</p>
              <p>
                Great recipe overall. I added a bit more garlic than called for and it turned out delicious. The cooking
                time was accurate and the instructions were clear.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
