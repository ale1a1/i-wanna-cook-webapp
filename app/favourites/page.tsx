"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/redux/hooks"
import { selectAuth } from "@/redux/features/auth/authSlice"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, Clock, Users, Trash2, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"

interface Favourite {
  id: string
  recipe_id: string
  recipe_title: string
  recipe_image: string
  ready_in_minutes: number
  servings: number
}

export default function FavouritesPage() {
  const { user } = useAppSelector(selectAuth)
  const router = useRouter()
  const [favourites, setFavourites] = useState<Favourite[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.push("/login"); return }
    fetch(`/api/favourites?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => { setFavourites(data.favourites || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user, router])

  const handleRemove = async (recipeId: string, title: string) => {
    await fetch("/api/favourites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user!.id, recipeId }),
    })
    setFavourites((prev) => prev.filter((f) => f.recipe_id !== recipeId))
    toast(`Removed ${title} from favourites`)
  }

  if (!user) return null

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Heart className="h-6 w-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-bold">Your Favourites</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : favourites.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center text-center gap-4">
            <Heart className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No favourites yet</p>
            <p className="text-sm text-muted-foreground">When you find a recipe you love, hit the heart button to save it here.</p>
            <Link href="/search">
              <Button>Find Recipes</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {favourites.map((fav) => (
            <Card key={fav.id} className="overflow-hidden border-2 border-border hover:border-primary/40 transition-colors flex flex-col">
              <div className="relative h-48 w-full flex-shrink-0">
                <Image src={fav.recipe_image || "/placeholder.svg"} alt={fav.recipe_title} fill style={{ objectFit: "cover" }} />
              </div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="line-clamp-2">{fav.recipe_title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{fav.ready_in_minutes} min</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{fav.servings} servings</span>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="p-4 pt-0 flex gap-2 mt-auto">
                <Link href={`/recipe/${fav.recipe_id}`} className="flex-1">
                  <Button className="w-full">View Recipe</Button>
                </Link>
                <Button variant="ghost" size="icon" className="text-destructive flex-shrink-0" onClick={() => handleRemove(fav.recipe_id, fav.recipe_title)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
