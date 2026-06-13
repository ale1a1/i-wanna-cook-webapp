import React, { createContext, useContext, useState, useCallback } from "react"
import { showAlert } from "../components/CustomAlert"
import { apiFetch } from "../lib/api"
import { useAuth } from "./AuthContext"
import { useGlobalError } from "./GlobalErrorContext"

export type ListType = "toTry" | "tried"

export type Recipe = {
  recipeId: string
  title: string
  image: string
  readyInMinutes: number
  servings: number
  tags: string[]
  folder: string | null
  searchFilters: Record<string, any> | null
  triedOn?: string
  satisfaction?: number
  timeAccuracy?: number
  difficulty?: string
  isTried: boolean
  isSaved: boolean
}

type MyRecipesContextType = {
  toTryRecipes: Recipe[]
  triedRecipes: Recipe[]
  loading: boolean
  toTryFolderOrder: string[]
  triedFolderOrder: string[]
  setToTryFolderOrder: (v: string[]) => void
  setTriedFolderOrder: (v: string[]) => void
  fetchAll: () => Promise<void>
  removeFromList: (recipe: Recipe, listType: ListType) => void
  markAsTried: (recipe: Recipe) => Promise<void>
  moveToTry: (recipe: Recipe) => Promise<void>
  moveRecipe: (recipe: Recipe, listType: ListType, targetFolder: string | null) => Promise<void>
  submitRating: (recipe: Recipe, values: { satisfaction: number; timeAccuracy: number; difficulty: string }) => Promise<void>
  saveTags: (recipe: Recipe, tags: string[]) => Promise<void>
  renameFolder: (listType: ListType, folder: string, newName: string) => Promise<void>
  deleteFolder: (listType: ListType, folder: string) => Promise<void>
  registerFolder: (listType: ListType, folderName: string) => void
}

const MyRecipesContext = createContext<MyRecipesContextType | null>(null)

export function MyRecipesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { showError } = useGlobalError()

  const [toTryRecipes, setToTryRecipes] = useState<Recipe[]>([])
  const [triedRecipes, setTriedRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [toTryFolderOrder, setToTryFolderOrder] = useState<string[]>([])
  const [triedFolderOrder, setTriedFolderOrder] = useState<string[]>([])

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [favsRes, triedRes, foldersRes] = await Promise.all([
        apiFetch(`/api/favourites?userId=${user.id}`, { screen: "My Recipes" }),
        apiFetch(`/api/tried-recipes?userId=${user.id}`, { screen: "My Recipes" }),
        apiFetch(`/api/folders?userId=${user.id}`, { screen: "My Recipes" }).catch(() => null),
      ])
      const favsData = await favsRes.json()
      const triedData = await triedRes.json()
      const foldersData = foldersRes ? await foldersRes.json().catch(() => ({ folders: [] })) : { folders: [] }

      const savedList: Recipe[] = (favsData.favourites ?? []).map((f: any) => ({
        recipeId: f.recipe_id, title: f.recipe_title, image: f.recipe_image,
        readyInMinutes: f.ready_in_minutes ?? 0, servings: f.servings ?? 0,
        tags: f.tags ?? [], folder: f.folder ?? null, searchFilters: f.search_filters ?? null,
        isSaved: true, isTried: false,
      }))

      const triedList: Recipe[] = (triedData.triedRecipes ?? []).map((t: any) => ({
        recipeId: t.recipe_id, title: t.recipe_title,
        image: t.recipe_image ?? `https://spoonacular.com/recipeImages/${t.recipe_id}-312x231.jpg`,
        readyInMinutes: t.estimated_time ?? 0, servings: 0, tags: [], folder: t.folder ?? null,
        searchFilters: t.search_filters ?? null, isSaved: false, isTried: true,
        triedOn: t.tried_on, satisfaction: t.satisfaction, timeAccuracy: t.time_accuracy, difficulty: t.difficulty,
      }))

      setToTryRecipes(savedList)
      setTriedRecipes(triedList)

      const persistedToTry = (foldersData.folders ?? []).filter((f: any) => f.list_type === "toTry").map((f: any) => f.folder_name as string)
      const persistedTried = (foldersData.folders ?? []).filter((f: any) => f.list_type === "tried").map((f: any) => f.folder_name as string)
      const recipesToTryFolders = Array.from(new Set(savedList.map(r => r.folder).filter(Boolean))) as string[]
      const recipeTriedFolders = Array.from(new Set(triedList.map(r => r.folder).filter(Boolean))) as string[]

      setToTryFolderOrder(prev => {
        const all = Array.from(new Set([...persistedToTry, ...recipesToTryFolders]))
        return [...prev, ...all.filter(f => !prev.includes(f))]
      })
      setTriedFolderOrder(prev => {
        const all = Array.from(new Set([...persistedTried, ...recipeTriedFolders]))
        return [...prev, ...all.filter(f => !prev.includes(f))]
      })
    } catch (e: any) {
      showError(e?.message ?? "Failed to load recipes", "My Recipes", fetchAll)
    } finally { setLoading(false) }
  }, [user])

  const registerFolder = useCallback((listType: ListType, folderName: string) => {
    if (!user || !folderName) return
    apiFetch("/api/folders", { method: "POST", body: JSON.stringify({ userId: user.id, listType, folderName }) }).catch(() => {})
  }, [user])

  const removeFromList = useCallback((recipe: Recipe, listType: ListType) => {
    const listName = listType === "toTry" ? "Try List" : "Tried"
    showAlert({ title: `Remove from ${listName}`, message: `Remove "${recipe.title}"?`, buttons: [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive", onPress: async () => {
          const setter = listType === "toTry" ? setToTryRecipes : setTriedRecipes
          setter(prev => prev.filter(r => r.recipeId !== recipe.recipeId))
          const endpoint = listType === "toTry" ? "/api/favourites" : "/api/tried-recipes"
          await apiFetch(endpoint, { method: "DELETE", body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId }) })
        }
      },
    ]})
  }, [user])

  const markAsTried = useCallback(async (recipe: Recipe) => {
    return new Promise<void>((resolve) => {
      showAlert({ title: "Mark as Tried", message: `Move "${recipe.title}" to your Tried list?`, buttons: [
        { text: "Cancel", style: "cancel", onPress: () => resolve() },
        {
          text: "Mark Tried", onPress: async () => {
            try {
              await Promise.all([
                apiFetch("/api/tried-recipes", { method: "POST", body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId, recipeTitle: recipe.title, recipeImage: recipe.image, readyInMinutes: recipe.readyInMinutes, folder: recipe.folder, searchFilters: recipe.searchFilters }) }),
                apiFetch("/api/favourites", { method: "DELETE", body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId }) }),
              ])
              setToTryRecipes(prev => prev.filter(r => r.recipeId !== recipe.recipeId))
              setTriedRecipes(prev => [{ ...recipe, isTried: true, isSaved: false, satisfaction: undefined, timeAccuracy: undefined, difficulty: undefined }, ...prev.filter(r => r.recipeId !== recipe.recipeId)])
              if (recipe.folder) { setTriedFolderOrder(prev => prev.includes(recipe.folder!) ? prev : [...prev, recipe.folder!]); registerFolder("tried", recipe.folder) }
            } catch { showAlert({ title: "Error", message: "Failed to mark as tried." }) }
            resolve()
          }
        },
      ]})
    })
  }, [user, registerFolder])

  const moveToTry = useCallback(async (recipe: Recipe) => {
    return new Promise<void>((resolve) => {
      showAlert({ title: "Move to To Try", message: `Move "${recipe.title}" back to your To Try list?`, buttons: [
        { text: "Cancel", style: "cancel", onPress: () => resolve() },
        {
          text: "Move", onPress: async () => {
            try {
              await Promise.all([
                apiFetch("/api/favourites", { method: "POST", body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId, recipeTitle: recipe.title, recipeImage: recipe.image, readyInMinutes: recipe.readyInMinutes, folder: recipe.folder }) }),
                apiFetch("/api/tried-recipes", { method: "DELETE", body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId }) }),
              ])
              setTriedRecipes(prev => prev.filter(r => r.recipeId !== recipe.recipeId))
              setToTryRecipes(prev => [{ ...recipe, isTried: false, isSaved: true, satisfaction: undefined, timeAccuracy: undefined, difficulty: undefined, triedOn: undefined }, ...prev.filter(r => r.recipeId !== recipe.recipeId)])
              if (recipe.folder) { setToTryFolderOrder(prev => prev.includes(recipe.folder!) ? prev : [...prev, recipe.folder!]); registerFolder("toTry", recipe.folder) }
            } catch { showAlert({ title: "Error", message: "Failed to move recipe." }) }
            resolve()
          }
        },
      ]})
    })
  }, [user, registerFolder])

  const moveRecipe = useCallback(async (recipe: Recipe, listType: ListType, targetFolder: string | null) => {
    const endpoint = listType === "toTry" ? "/api/favourites" : "/api/tried-recipes"
    await apiFetch(endpoint, { method: "PATCH", body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId, targetFolder }) })
    if (targetFolder) registerFolder(listType, targetFolder)
    const setter = listType === "toTry" ? setToTryRecipes : setTriedRecipes
    setter(prev => prev.map(r => r.recipeId === recipe.recipeId ? { ...r, folder: targetFolder } : r))
  }, [user, registerFolder])

  const submitRating = useCallback(async (recipe: Recipe, values: { satisfaction: number; timeAccuracy: number; difficulty: string }) => {
    await apiFetch("/api/tried-recipes", { method: "PATCH", screen: "My Recipes", body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId, ...values }) })
    setTriedRecipes(prev => prev.map(r => r.recipeId === recipe.recipeId ? { ...r, ...values } : r))
  }, [user])

  const saveTags = useCallback(async (recipe: Recipe, tags: string[]) => {
    await apiFetch("/api/favourites", { method: "PATCH", body: JSON.stringify({ userId: user!.id, recipeId: recipe.recipeId, tags }) })
    setToTryRecipes(prev => prev.map(r => r.recipeId === recipe.recipeId ? { ...r, tags } : r))
  }, [user])

  const renameFolder = useCallback(async (listType: ListType, folder: string, newName: string) => {
    const endpoint = listType === "toTry" ? "/api/favourites" : "/api/tried-recipes"
    const list = listType === "toTry" ? toTryRecipes : triedRecipes
    const toRename = list.filter(r => r.folder === folder)
    await Promise.all([
      ...toRename.map(r => apiFetch(endpoint, { method: "PATCH", body: JSON.stringify({ userId: user!.id, recipeId: r.recipeId, targetFolder: newName }) })),
      apiFetch("/api/folders", { method: "PATCH", body: JSON.stringify({ userId: user!.id, listType, oldName: folder, newName }) }),
    ])
    const setter = listType === "toTry" ? setToTryRecipes : setTriedRecipes
    setter(prev => prev.map(r => r.folder === folder ? { ...r, folder: newName } : r))
    const orderSetter = listType === "toTry" ? setToTryFolderOrder : setTriedFolderOrder
    orderSetter(prev => prev.map(f => f === folder ? newName : f))
  }, [user, toTryRecipes, triedRecipes])

  const deleteFolder = useCallback(async (listType: ListType, folder: string) => {
    return new Promise<void>((resolve) => {
      showAlert({ title: "Delete Folder", message: `Delete folder "${folder}" and remove all its recipes?`, buttons: [
        { text: "Cancel", style: "cancel", onPress: () => resolve() },
        {
          text: "Delete", style: "destructive", onPress: async () => {
            const endpoint = listType === "toTry" ? "/api/favourites" : "/api/tried-recipes"
            const list = listType === "toTry" ? toTryRecipes : triedRecipes
            const toDelete = list.filter(r => r.folder === folder)
            await Promise.all([
              ...toDelete.map(r => apiFetch(endpoint, { method: "DELETE", body: JSON.stringify({ userId: user!.id, recipeId: r.recipeId }) })),
              apiFetch("/api/folders", { method: "DELETE", body: JSON.stringify({ userId: user!.id, listType, folderName: folder }) }),
            ])
            const setter = listType === "toTry" ? setToTryRecipes : setTriedRecipes
            setter(prev => prev.filter(r => r.folder !== folder))
            const orderSetter = listType === "toTry" ? setToTryFolderOrder : setTriedFolderOrder
            orderSetter(prev => prev.filter(f => f !== folder))
            resolve()
          }
        },
      ]})
    })
  }, [user, toTryRecipes, triedRecipes])

  return (
    <MyRecipesContext.Provider value={{
      toTryRecipes, triedRecipes, loading, toTryFolderOrder, triedFolderOrder,
      setToTryFolderOrder, setTriedFolderOrder,
      fetchAll, removeFromList, markAsTried, moveToTry, moveRecipe,
      submitRating, saveTags, renameFolder, deleteFolder, registerFolder,
    }}>
      {children}
    </MyRecipesContext.Provider>
  )
}

export function useMyRecipes() {
  const ctx = useContext(MyRecipesContext)
  if (!ctx) throw new Error("useMyRecipes must be used within MyRecipesProvider")
  return ctx
}
