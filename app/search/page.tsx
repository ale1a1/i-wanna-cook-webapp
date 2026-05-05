"use client"

import { useEffect } from "react"
import { useAppDispatch } from "@/redux/hooks"
import { resetFilters } from "@/redux/features/filters/filtersSlice"
import { resetFiltersApplied } from "@/redux/features/recipes/recipesSlice"
import RecipeFilters from "@/components/recipe-filters"
import RecipeResults from "@/components/recipe-results"

export default function Home() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(resetFilters())
    dispatch(resetFiltersApplied())
  }, [dispatch])

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3 lg:w-1/4">
          <RecipeFilters />
        </div>
        <div className="md:w-2/3 lg:w-3/4">
          <RecipeResults />
        </div>
      </div>

    </div>
  )
}
