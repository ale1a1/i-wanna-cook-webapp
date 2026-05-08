import { notFound } from "next/navigation"
import RecipeDetailClient from "./RecipeDetailClient"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) return []

  try {
    const res = await fetch(
      `https://api.spoonacular.com/recipes/random?apiKey=${apiKey}&number=20`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.recipes ?? []).map((r: { id: number }) => ({ id: String(r.id) }))
  } catch {
    return []
  }
}

async function getRecipe(id: string) {
  const apiKey = process.env.SPOONACULAR_API_KEY
  if (!apiKey) return null

  const res = await fetch(
    `https://api.spoonacular.com/recipes/${id}/information?apiKey=${apiKey}&includeNutrition=true`,
    { next: { revalidate: 3600 } }
  )
  if (!res.ok) return null
  return res.json()
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params
  const recipe = await getRecipe(id)

  if (!recipe) notFound()

  return <RecipeDetailClient recipe={recipe} />
}
