"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Clock, Users, ChefHat, ArrowLeft, Heart, Star, Bookmark, Share2, CheckCircle, Loader2, ShoppingCart, Plus, Minus } from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/redux/hooks"
import { selectAuth } from "@/redux/features/auth/authSlice"
import { addTriedRecipe, selectTriedRecipes } from "@/redux/features/recipes/recipesSlice"
import Link from "next/link"

export default function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector(selectAuth)
  const triedRecipes = useAppSelector(selectTriedRecipes)
  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingAll, setAddingAll] = useState(false)
  const [addedIngredients, setAddedIngredients] = useState<Set<string>>(new Set())
  const [addedAll, setAddedAll] = useState(false)

  const isRecipeTried = triedRecipes.some((tried) => tried.id === id)

  useEffect(() => {
    async function loadRecipe() {
      try {
        const [recipeRes, listRes] = await Promise.all([
          fetch(`/api/recipes/${id}`),
          user ? fetch(`/api/shopping-list?userId=${user.id}`) : Promise.resolve(null),
        ])
        if (!recipeRes.ok) throw new Error("Recipe not found")
        const data = await recipeRes.json()
        setRecipe(data)
        if (listRes) {
          const listData = await listRes.json()
          const existingForThisRecipe = (listData.items || [])
            .filter((i: any) => i.recipe_id === data.id.toString())
            .map((i: any) => i.ingredient_name)
          setAddedIngredients(new Set(existingForThisRecipe))
          if (existingForThisRecipe.length > 0 && existingForThisRecipe.length === data.extendedIngredients?.length) {
            setAddedAll(true)
          }
        }
      } catch (err) {
        setError("Could not load recipe. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    loadRecipe()
  }, [id, user])

  const handleMarkAsTried = () => {
    if (!user) {
      router.push("/login?returnUrl=" + encodeURIComponent(`/recipe/${id}`))
      return
    }
    if (recipe) {
      const today = new Date()
      const formattedDate = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`
      dispatch(addTriedRecipe({
        id: recipe.id.toString(),
        title: recipe.title,
        triedOn: formattedDate,
        estimatedTime: recipe.readyInMinutes,
      }))
    }
  }

  const handleAddAllToShoppingList = async () => {
    if (!user) { router.push("/login"); return }
    setAddingAll(true)
    const ingredients = recipe.extendedIngredients?.map((ing: any) => ({
      name: ing.name,
      amount: `${ing.amount} ${ing.unit}`.trim(),
    })) || []
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, recipeId: recipe.id.toString(), recipeTitle: recipe.title, ingredients }),
    })
    setAddedAll(true)
    setAddingAll(false)
  }

  const handleAddOneToShoppingList = async (ing: any) => {
    if (!user) { router.push("/login"); return }
    await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        recipeId: recipe.id.toString(),
        recipeTitle: recipe.title,
        ingredients: [{ name: ing.name, amount: `${ing.amount} ${ing.unit}`.trim() }],
      }),
    })
    setAddedIngredients((prev) => new Set(prev).add(ing.name))
  }

  const handleRemoveOneFromShoppingList = async (ing: any) => {
    if (!user) return
    const res = await fetch(`/api/shopping-list?userId=${user.id}`)
    const data = await res.json()
    const item = data.items?.find((i: any) => i.recipe_id === recipe.id.toString() && i.ingredient_name === ing.name)
    if (item) {
      await fetch("/api/shopping-list", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, itemId: item.id }),
      })
    }
    setAddedIngredients((prev) => {
      const next = new Set(prev)
      next.delete(ing.name)
      return next
    })
    setAddedAll(false)
  }

  const stripHtml = (html: string) => {
    const tmp = document.createElement("DIV")
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ""
  }

  const getNutrient = (name: string) => {
    const nutrients = recipe?.nutrition?.nutrients || []
    return nutrients.find((n: any) => n.name === name)?.amount ?? "—"
  }

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Recipe Not Found</h1>
            <p className="text-muted-foreground mb-6">{error || "This recipe doesn't exist or has been removed."}</p>
            <Button onClick={() => router.push("/")}>Browse Recipes</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Recipes
      </Button>

      <div className="relative rounded-lg overflow-hidden h-[300px] md:h-[400px] mb-6">
        <Image src={recipe.image || "/placeholder.svg"} alt={recipe.title} fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
          <div className="p-6 text-white">
            <h1 className="text-2xl md:text-3xl font-bold">{recipe.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {recipe.diets?.map((diet: string, i: number) => (
                <Badge key={i} variant="outline" className="bg-black/30 text-white border-white">{diet}</Badge>
              ))}
              {recipe.cuisines?.map((cuisine: string, i: number) => (
                <Badge key={i} variant="outline" className="bg-black/30 text-white border-white">{cuisine}</Badge>
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
              <p className="text-sm text-muted-foreground">Health Score</p>
              <p className="font-medium">{recipe.healthScore ?? "—"} / 100</p>
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
                <Link href="/login" className="text-primary hover:underline">Log in</Link> to mark as tried
              </p>
            )}
          </div>
        )}
      </div>

      {recipe.summary && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">About this Recipe</h2>
          <p className="text-muted-foreground">{stripHtml(recipe.summary)}</p>
        </div>
      )}

      <Tabs defaultValue="ingredients" className="mb-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="pt-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold">Ingredients for {recipe.servings} servings</h3>
          </div>
          <div className="mb-4">
            <Button size="sm" variant={addedAll ? "secondary" : "default"} onClick={handleAddAllToShoppingList} disabled={addingAll || addedAll} className="flex items-center gap-2">
              {addingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              {addedAll ? "All Added to Cart!" : "Add All to Shopping List"}
            </Button>
          </div>
          <ul className="space-y-2">
            {recipe.extendedIngredients?.map((ingredient: any, index: number) => (
              <li key={index} className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <span className="font-medium">{ingredient.name}</span>
                  <span className="text-muted-foreground"> — {ingredient.amount} {ingredient.unit}</span>
                </div>
                {(addedIngredients.has(ingredient.name) || addedAll) ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive flex-shrink-0 gap-1 text-xs"
                    onClick={() => handleRemoveOneFromShoppingList(ingredient)}
                  >
                    <Minus className="h-3 w-3" />
                    <span className="hidden sm:inline">Remove</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-primary flex-shrink-0 gap-1 text-xs"
                    onClick={() => handleAddOneToShoppingList(ingredient)}
                    title="Add to shopping list"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="instructions" className="pt-4">
          <h3 className="text-lg font-semibold mb-4">Cooking Instructions</h3>
          {recipe.analyzedInstructions?.[0]?.steps?.length > 0 ? (
            <ol className="space-y-6">
              {recipe.analyzedInstructions[0].steps.map((step: any, index: number) => (
                <li key={index} className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground flex-shrink-0">
                    {step.number}
                  </div>
                  <div className="space-y-2">
                    <p>{step.step}</p>
                    {step.ingredients?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Ingredients used:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {step.ingredients.map((ing: any, i: number) => (
                            <Badge key={i} variant="secondary">{ing.name}</Badge>
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
            {[
              { label: "Calories", key: "Calories", unit: "kcal" },
              { label: "Protein", key: "Protein", unit: "g" },
              { label: "Carbs", key: "Carbohydrates", unit: "g" },
              { label: "Fat", key: "Fat", unit: "g" },
            ].map(({ label, key, unit }) => (
              <Card key={key}>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{getNutrient(key)}</p>
                  <p className="text-xs text-muted-foreground">{unit}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground italic mt-6">
            Nutritional information is sourced from Spoonacular and may vary based on specific ingredients and preparation.
          </p>
        </TabsContent>
      </Tabs>

      <div className="border-t pt-8 mb-8">
        <h2 className="text-xl font-bold mb-4">Reviews</h2>
        <div className="flex items-center gap-2 mb-6">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className={`h-5 w-5 ${star <= 4 ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            ))}
          </div>
          <span className="font-medium">4.0</span>
          <span className="text-muted-foreground">(24 reviews)</span>
        </div>

        <div className="space-y-6">
          {[
            { name: "Sarah Johnson", stars: 5, date: "12/04/2024", text: "This recipe was amazing! The flavors were perfectly balanced and it was easy to follow. My family loved it and asked me to make it again next week." },
            { name: "Michael Chen", stars: 4, date: "05/04/2024", text: "Great recipe overall. I added a bit more garlic than called for and it turned out delicious. The cooking time was accurate and the instructions were clear." },
          ].map((review) => (
            <Card key={review.name}>
              <CardContent className="p-4">
                <div className="flex justify-between mb-2">
                  <div className="font-medium">{review.name}</div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`h-4 w-4 ${star <= review.stars ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Cooked on: {review.date}</p>
                <p>{review.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
