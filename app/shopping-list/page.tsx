"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppSelector } from "@/redux/hooks"
import { selectAuth } from "@/redux/features/auth/authSlice"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ShoppingCart, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog"

type ShoppingItem = {
  id: string
  recipe_id: string
  recipe_title: string
  ingredient_name: string
  ingredient_amount: string
  checked: boolean
}

type GroupedItems = Record<string, ShoppingItem[]>

export default function ShoppingListPage() {
  const { user } = useAppSelector(selectAuth)
  const router = useRouter()
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [removeRecipe, setRemoveRecipe] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    if (!user) { router.push("/login"); return }
    fetchList()
  }, [user])

  const fetchList = async () => {
    setLoading(true)
    const res = await fetch(`/api/shopping-list?userId=${user!.id}`)
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  const toggleCheck = async (item: ShoppingItem) => {
    const updated = items.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i)
    setItems(updated)
    await fetch("/api/shopping-list/check", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user!.id, itemId: item.id, checked: !item.checked }),
    })
  }

  const deleteItem = async (itemId: string) => {
    setItems(items.filter((i) => i.id !== itemId))
    await fetch("/api/shopping-list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user!.id, itemId }),
    })
  }

  const deleteByRecipe = async (recipeId: string) => {
    setItems(items.filter((i) => i.recipe_id !== recipeId))
    await fetch("/api/shopping-list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user!.id, recipeId }),
    })
  }

  const clearAll = async () => {
    setItems([])
    await fetch("/api/shopping-list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user!.id }),
    })
  }

  const toggleCollapse = (recipeId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(recipeId) ? next.delete(recipeId) : next.add(recipeId)
      return next
    })
  }

  const grouped: GroupedItems = items.reduce((acc, item) => {
    if (!acc[item.recipe_id]) acc[item.recipe_id] = []
    acc[item.recipe_id].push(item)
    return acc
  }, {} as GroupedItems)

  const checkedCount = items.filter((i) => i.checked).length

  if (loading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingCart className="h-6 w-6 text-primary flex-shrink-0" />
          <h1 className="text-2xl font-bold">Shopping List</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <ShoppingCart className="h-6 w-6 text-primary flex-shrink-0" />
        <h1 className="text-2xl font-bold">Shopping List</h1>
        {items.length > 0 && (
          <span className="text-sm text-muted-foreground">{checkedCount}/{items.length}</span>
        )}
        {items.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive ml-auto flex-shrink-0" onClick={() => setClearAllOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear All
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove all items from shopping list</TooltipContent>
          </Tooltip>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center text-center gap-4">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">Your shopping list is empty</p>
            <p className="text-sm text-muted-foreground">Open any recipe and add ingredients from the Ingredients tab.</p>
            <Button onClick={() => router.push("/search")}>Browse Recipes</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([recipeId, recipeItems]) => {
            const isCollapsed = collapsed.has(recipeId)
            const allChecked = recipeItems.every((i) => i.checked)
            return (
              <Card key={recipeId} className={allChecked ? "opacity-60" : ""}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="flex items-center gap-1.5 text-left min-w-0"
                          onClick={() => toggleCollapse(recipeId)}
                        >
                          {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                          <CardTitle className="text-base leading-snug">{recipeItems[0].recipe_title}</CardTitle>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{isCollapsed ? "Expand" : "Collapse"}</TooltipContent>
                    </Tooltip>
                    <span className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">({recipeItems.length})</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive flex-shrink-0" onClick={() => setRemoveRecipe({ id: recipeId, title: recipeItems[0].recipe_title })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove all ingredients from this recipe</TooltipContent>
                    </Tooltip>
                  </div>
                </CardHeader>
                {!isCollapsed && (
                  <CardContent className="p-4 pt-2">
                    <ul className="space-y-2">
                      {recipeItems.map((item) => (
                        <li key={item.id} className="flex items-center gap-3">
                          <Checkbox
                            checked={item.checked}
                            onCheckedChange={() => toggleCheck(item)}
                            id={item.id}
                          />
                          <label
                            htmlFor={item.id}
                            className={`flex-1 text-sm cursor-pointer ${item.checked ? "line-through text-muted-foreground" : ""}`}
                          >
                            <span className="font-medium">{item.ingredient_name}</span>
                            {item.ingredient_amount && (
                              <span className="text-muted-foreground"> — {item.ingredient_amount}</span>
                            )}
                          </label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive flex-shrink-0"
                                onClick={() => deleteItem(item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove {item.ingredient_name}</TooltipContent>
                          </Tooltip>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>

    {/* Clear all confirmation */}
    <Dialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clear entire shopping list?</DialogTitle>
          <DialogDescription>
            This will remove every ingredient from all recipes in one go. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={() => { clearAll(); setClearAllOpen(false) }}>
            Yes, clear everything
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Remove recipe group confirmation */}
    <Dialog open={!!removeRecipe} onOpenChange={(open) => { if (!open) setRemoveRecipe(null) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove all ingredients?</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove all ingredients from <span className="font-semibold">{removeRecipe?.title}</span>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={() => { if (removeRecipe) { deleteByRecipe(removeRecipe.id); setRemoveRecipe(null) } }}>
            Yes, remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    </TooltipProvider>
  )
}
