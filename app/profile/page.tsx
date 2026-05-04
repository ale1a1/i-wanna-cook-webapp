"use client"

import { useEffect } from "react"
import { useAppSelector, useAppDispatch } from "@/redux/hooks"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { User, Settings, Moon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { selectAuth, logout } from "@/redux/features/auth/authSlice"
import { selectTriedRecipes } from "@/redux/features/recipes/recipesSlice"

export default function ProfilePage() {
  const { user } = useAppSelector(selectAuth)
  const triedRecipes = useAppSelector(selectTriedRecipes)
  const { setTheme, theme } = useTheme()
  const router = useRouter()
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!user) router.push("/login")
  }, [user, router])

  if (!user) return null

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleLogout = () => {
    dispatch(logout())
    localStorage.removeItem("user")
    router.push("/login")
  }

  // Calculate stats
  const recipesTried = triedRecipes.length
  const avgRating =
    triedRecipes.length > 0
      ? (triedRecipes.reduce((sum, recipe) => sum + (recipe.satisfaction || 0), 0) / recipesTried).toFixed(1)
      : "0.0"

  // Get favorite cuisines (simplified)
  const favoriteCuisines = 2

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.username}</h2>
              <p className="text-muted-foreground">Member since April 2024</p>
            </div>
          </div>

          <h3 className="text-xl font-semibold mb-4">Account Settings</h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <span>Preferences</span>
              </div>
              <Button variant="ghost" size="sm" className="text-primary">
                Edit
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <span>Profile Information</span>
              </div>
              <Button variant="ghost" size="sm" className="text-primary">
                Edit
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <span>Dark Mode</span>
              </div>
              <Button variant="ghost" size="sm" onClick={toggleTheme}>
                <Moon className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          <h3 className="text-xl font-semibold mb-4">Stats</h3>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{recipesTried}</p>
              <p className="text-sm text-muted-foreground">Recipes Tried</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{avgRating}</p>
              <p className="text-sm text-muted-foreground">Avg. Rating</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{favoriteCuisines}</p>
              <p className="text-sm text-muted-foreground">Favorite Cuisines</p>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <Button variant="outline" className="text-destructive" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
