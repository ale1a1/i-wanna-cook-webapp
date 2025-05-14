"use client"

import { useState, useEffect } from "react"
import { useAppSelector, useAppDispatch } from "@/redux/hooks"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, AlertTriangle, Star, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { selectAuth } from "@/redux/features/auth/authSlice"
import { selectTriedRecipes, updateTriedRecipe, removeTriedRecipe } from "@/redux/features/recipes/recipesSlice"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function TriedRecipesPage() {
  const { user } = useAppSelector(selectAuth)
  const triedRecipes = useAppSelector(selectTriedRecipes)
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null)
  const [recipeToRemove, setRecipeToRemove] = useState<string | null>(null)
  const [ratingValues, setRatingValues] = useState({
    satisfaction: 0,
    timeAccuracy: 0,
    difficulty: "Moderate",
  })

  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  if (!user) {
    return null
  }

  const handleRateRecipe = (recipe: any) => {
    setSelectedRecipe(recipe)
    // Initialize rating values with existing ratings or defaults
    setRatingValues({
      satisfaction: recipe.satisfaction || 0,
      timeAccuracy: recipe.timeAccuracy || 0,
      difficulty: recipe.difficulty || "Moderate",
    })
    setRatingDialogOpen(true)
  }

  const handleSubmitRating = () => {
    if (selectedRecipe) {
      dispatch(
        updateTriedRecipe({
          id: selectedRecipe.id,
          satisfaction: ratingValues.satisfaction,
          timeAccuracy: ratingValues.timeAccuracy,
          difficulty: ratingValues.difficulty,
        }),
      )
      setRatingDialogOpen(false)
    }
  }

  const handleRemoveRecipe = (recipeId: string) => {
    setRecipeToRemove(recipeId)
    setConfirmDialogOpen(true)
  }

  const confirmRemoveRecipe = () => {
    if (recipeToRemove) {
      dispatch(removeTriedRecipe(recipeToRemove))
      setConfirmDialogOpen(false)
      setRecipeToRemove(null)
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
          />
        ))}
      </div>
    )
  }

  const handleStarClick = (type: "satisfaction" | "timeAccuracy", value: number) => {
    setRatingValues((prev) => ({
      ...prev,
      [type]: value,
    }))
  }

  const handleDifficultyChange = (value: string) => {
    setRatingValues((prev) => ({
      ...prev,
      difficulty: value,
    }))
  }

  const getRecipeTitle = (recipeId: string | null) => {
    if (!recipeId) return ""
    const recipe = triedRecipes.find((r) => r.id === recipeId)
    return recipe ? recipe.title : ""
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Your Recipe History</h1>

      {triedRecipes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">You haven't tried any recipes yet.</p>
            <Button className="mt-4" onClick={() => router.push("/")}>
              Discover Recipes
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {triedRecipes.map((recipe, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <Link href={`/recipe/${recipe.id}`}>
                      <h2 className="text-xl font-semibold hover:text-primary hover:underline cursor-pointer">
                        {recipe.title}
                      </h2>
                    </Link>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Tried on: {recipe.triedOn}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 md:mt-0">
                    <Button variant="outline" size="sm" onClick={() => handleRateRecipe(recipe)}>
                      {recipe.satisfaction ? "Edit Rating" : "Rate Recipe"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleRemoveRecipe(recipe.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {recipe.satisfaction && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Satisfaction</p>
                      {renderStars(recipe.satisfaction)}
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Time Accuracy</p>
                      <div className="flex items-center">
                        {renderStars(recipe.timeAccuracy || 0)}
                        <span className="text-xs text-muted-foreground ml-2">
                          API estimate: {recipe.estimatedTime} mins
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Difficulty</p>
                      <div className="flex items-center">
                        <span className="text-sm">{recipe.difficulty}</span>
                        <span className="text-xs text-muted-foreground ml-2">API estimate: Moderate</span>
                      </div>
                    </div>
                  </div>
                )}

                {!recipe.satisfaction && (
                  <p className="text-sm text-muted-foreground italic mt-4">You haven't rated this recipe yet.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
          </DialogHeader>

          {selectedRecipe && (
            <div className="space-y-6">
              <p className="text-sm">How was your experience with {selectedRecipe.title}?</p>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center mb-2">
                    <Star className="h-4 w-4 mr-2 text-primary" />
                    <Label>Overall Satisfaction</Label>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Button
                        key={star}
                        variant="ghost"
                        size="sm"
                        className="p-1"
                        onClick={() => handleStarClick("satisfaction", star)}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= ratingValues.satisfaction ? "fill-primary text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">Select rating</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    <Label>Time Accuracy</Label>
                    <span className="text-xs text-muted-foreground ml-2">(Stated prep time: 30 mins)</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Button
                        key={star}
                        variant="ghost"
                        size="sm"
                        className="p-1"
                        onClick={() => handleStarClick("timeAccuracy", star)}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= ratingValues.timeAccuracy ? "fill-primary text-primary" : "text-muted-foreground"
                          }`}
                        />
                      </Button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">Select rating</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center mb-2">
                    <AlertTriangle className="h-4 w-4 mr-2 text-primary" />
                    <Label>Difficulty</Label>
                  </div>
                  <RadioGroup value={ratingValues.difficulty} onValueChange={handleDifficultyChange}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Very Easy" id="very-easy" />
                      <Label htmlFor="very-easy">Very Easy</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Easy" id="easy" />
                      <Label htmlFor="easy">Easy</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Moderate" id="moderate" />
                      <Label htmlFor="moderate">Moderate</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Difficult" id="difficult" />
                      <Label htmlFor="difficult">Difficult</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Very Difficult" id="very-difficult" />
                      <Label htmlFor="very-difficult">Very Difficult</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmitRating}>Submit Rating</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Recipe</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{getRecipeTitle(recipeToRemove)}" from your history?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmRemoveRecipe}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
