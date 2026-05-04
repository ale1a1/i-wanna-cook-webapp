"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function RecipeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h2 className="text-2xl font-bold mb-4">Could not load recipe</h2>
      <p className="text-muted-foreground mb-8">The recipe may have been removed or there was a network issue.</p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push("/")}>Browse Recipes</Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
