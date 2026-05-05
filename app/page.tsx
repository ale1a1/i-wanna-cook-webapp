"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppDispatch } from "@/redux/hooks"
import { resetFilters } from "@/redux/features/filters/filtersSlice"
import { fetchRecipes, resetFiltersApplied } from "@/redux/features/recipes/recipesSlice"
import { Button } from "@/components/ui/button"
import { ChefHat, Shuffle, Search, Clock, Globe, Heart, SlidersHorizontal, UtensilsCrossed, Star } from "lucide-react"

const FEATURES = [
  {
    icon: Clock,
    title: "Filter by Time",
    description: "Find recipes that fit your schedule, from 15-minute meals to slow-cooked feasts.",
  },
  {
    icon: Globe,
    title: "Explore Cuisines",
    description: "Browse 27 world cuisines — Italian, Mexican, Thai, Indian and more.",
  },
  {
    icon: Heart,
    title: "Track What You Try",
    description: "Rate recipes you've made, log difficulty and time accuracy, build your cookbook.",
  },
]

export default function LandingPage() {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const handleSurpriseMe = () => {
    dispatch(resetFilters())
    dispatch(resetFiltersApplied())
    dispatch(
      fetchRecipes({
        prepTime: "any",
        budget: "any",
        diet: "any",
        taste: "any",
        healthiness: "any",
        cuisine: "any",
        ingredients: [],
        applied: false,
        hasActiveFilters: false,
      })
    )
    router.push("/search")
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="mb-6 flex items-center justify-center h-24 w-24 rounded-full bg-primary/10">
          <ChefHat className="h-12 w-12 text-primary" />
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
          What Should I Cook?
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-10">
          Discover your next favourite meal. Filter by ingredients, diet, cuisine, budget and more — powered by Spoonacular.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/search">
            <Button size="lg" className="text-base px-8">
              <Search className="h-5 w-5 mr-2" />
              Find Recipes
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="text-base px-8" onClick={handleSurpriseMe}>
            <Shuffle className="h-5 w-5 mr-2" />
            Surprise Me
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/40">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Everything you need to decide</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col items-center text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="container max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
            <div className="flex flex-col items-center text-center gap-3 flex-1">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center relative">
                <SlidersHorizontal className="h-6 w-6 text-primary" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
              </div>
              <h3 className="font-semibold text-lg">Set your filters</h3>
              <p className="text-sm text-muted-foreground">Choose your prep time, budget, diet, cuisine, healthiness and taste — or type in ingredients you already have at home.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-3 flex-1">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center relative">
                <UtensilsCrossed className="h-6 w-6 text-primary" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
              </div>
              <h3 className="font-semibold text-lg">Browse recipes</h3>
              <p className="text-sm text-muted-foreground">Get real recipes from Spoonacular's database — with ingredients, steps, calories and nutrition info all in one place.</p>
            </div>
            <div className="flex flex-col items-center text-center gap-3 flex-1">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center relative">
                <Star className="h-6 w-6 text-primary" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">3</span>
              </div>
              <h3 className="font-semibold text-lg">Track what you make</h3>
              <p className="text-sm text-muted-foreground">Log the recipes you've tried, rate your satisfaction, and build your personal cookbook over time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to cook something great?</h2>
        <p className="text-muted-foreground mb-8">No sign-up needed to start searching.</p>
        <Link href="/search">
          <Button size="lg" className="text-base px-10">
            Get Started
          </Button>
        </Link>
      </section>
    </div>
  )
}
