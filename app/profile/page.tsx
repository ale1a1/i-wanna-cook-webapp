"use client"

import { useEffect, useState } from "react"
import { useAppSelector, useAppDispatch } from "@/redux/hooks"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { User, Settings, Moon, Sun, Monitor, Loader2, Eye, EyeOff, Pencil, Check, X, Trash2 } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { selectAuth, logout, updateUser } from "@/redux/features/auth/authSlice"
import { selectTriedRecipes } from "@/redux/features/recipes/recipesSlice"

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

type ThemeOption = "light" | "dark" | "system"

export default function ProfilePage() {
  const { user, accessToken } = useAppSelector(selectAuth)
  const triedRecipes = useAppSelector(selectTriedRecipes)
  const { setTheme, theme, resolvedTheme } = useTheme()
  const router = useRouter()
  const dispatch = useAppDispatch()

  // Username edit
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [usernameError, setUsernameError] = useState("")

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" })
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Delete account
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    if (!user) router.push("/login")
  }, [user, router])

  if (!user) return null

  const newPasswordValid = PASSWORD_RULES.every((r) => r.test(passwordForm.new))

  // Username save
  const handleSaveUsername = async () => {
    if (newUsername.length < 3) { setUsernameError("Username must be at least 3 characters"); return }
    setUsernameLoading(true)
    setUsernameError("")
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, username: newUsername }),
      })
      const data = await res.json()
      if (!res.ok) { setUsernameError(data.error); return }
      dispatch(updateUser({ username: newUsername }))
      const saved = JSON.parse(localStorage.getItem("user") || "{}")
      localStorage.setItem("user", JSON.stringify({ ...saved, username: newUsername }))
      setEditingUsername(false)
    } catch {
      setUsernameError("Update failed. Please try again.")
    } finally {
      setUsernameLoading(false)
    }
  }

  // Theme save
  const handleThemeChange = async (newTheme: ThemeOption) => {
    setTheme(newTheme)
    dispatch(updateUser({ theme: newTheme }))
    const saved = JSON.parse(localStorage.getItem("user") || "{}")
    localStorage.setItem("user", JSON.stringify({ ...saved, theme: newTheme }))
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, theme: newTheme }),
      })
    } catch { /* non-critical */ }
  }

  // Password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPasswordValid) return
    if (passwordForm.new !== passwordForm.confirm) { setPasswordError("Passwords do not match"); return }
    if (!accessToken) { setPasswordError("Session expired. Please log in again."); return }
    setPasswordLoading(true)
    setPasswordError("")
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: passwordForm.current,
          newPassword: passwordForm.new,
          accessToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setPasswordError(data.error); return }
      setPasswordSuccess(true)
      setPasswordForm({ current: "", new: "", confirm: "" })
      setTimeout(() => { setPasswordSuccess(false); setShowPasswordForm(false) }, 2000)
    } catch {
      setPasswordError("Update failed. Please try again.")
    } finally {
      setPasswordLoading(false)
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (!accessToken) { setDeleteError("Session expired. Please log in again."); return }
    setDeleteLoading(true)
    setDeleteError("")
    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, accessToken }),
      })
      const data = await res.json()
      if (!res.ok) { setDeleteError(data.error); return }
      dispatch(logout())
      localStorage.removeItem("user")
      router.push("/")
    } catch {
      setDeleteError("Deletion failed. Please try again.")
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    localStorage.removeItem("user")
    router.push("/login")
  }

  const recipesTried = triedRecipes.length
  const avgRating = triedRecipes.length > 0
    ? (triedRecipes.reduce((sum, r) => sum + (r.satisfaction || 0), 0) / recipesTried).toFixed(1)
    : "0.0"

  const themeOptions: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ]

  return (
    <div className="container max-w-4xl mx-auto px-4 space-y-6">

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <User size={32} />
            </div>
            <div className="flex-1 min-w-0">
              {editingUsername ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="h-8 text-lg font-bold w-48"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={handleSaveUsername} disabled={usernameLoading}>
                    {usernameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { setEditingUsername(false); setUsernameError("") }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold truncate">{user.username}</h2>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setNewUsername(user.username); setEditingUsername(true) }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {usernameError && <p className="text-xs text-destructive mt-1">{usernameError}</p>}
              <p className="text-muted-foreground text-sm">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{recipesTried}</p>
              <p className="text-sm text-muted-foreground">Recipes Tried</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{avgRating}</p>
              <p className="text-sm text-muted-foreground">Avg. Rating</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            Preferences
          </h3>
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Theme</Label>
            <div className="flex gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleThemeChange(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                    theme === opt.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Security</h3>

          {!showPasswordForm ? (
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <span className="text-sm">Password</span>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => setShowPasswordForm(true)}>
                Change Password
              </Button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3 p-4 rounded-lg border">
              <h4 className="font-medium text-sm">Change Password</h4>
              {(["current", "new", "confirm"] as const).map((field) => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={`pwd-${field}`} className="text-xs capitalize">
                    {field === "current" ? "Current password" : field === "new" ? "New password" : "Confirm new password"}
                  </Label>
                  <div className="relative">
                    <Input
                      id={`pwd-${field}`}
                      type={showPasswords[field] ? "text" : "password"}
                      value={passwordForm[field]}
                      onChange={(e) => setPasswordForm((f) => ({ ...f, [field]: e.target.value }))}
                      className="pr-10 h-8 text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords((s) => ({ ...s, [field]: !s[field] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPasswords[field] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {field === "new" && passwordForm.new && (
                    <ul className="space-y-0.5 mt-1">
                      {PASSWORD_RULES.map((rule) => (
                        <li key={rule.label} className={`text-xs ${rule.test(passwordForm.new) ? "text-green-500" : "text-muted-foreground"}`}>
                          {rule.test(passwordForm.new) ? "✓" : "○"} {rule.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
              {passwordSuccess && <p className="text-xs text-green-500">Password changed successfully!</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm" disabled={passwordLoading || !newPasswordValid}>
                  {passwordLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowPasswordForm(false); setPasswordForm({ current: "", new: "", confirm: "" }); setPasswordError("") }}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Account actions */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all your data (shopping list, tried recipes, ratings). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-confirm" className="text-sm">
              Type <strong>{user.username}</strong> to confirm
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={user.username}
            />
            {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirm("") }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== user.username || deleteLoading}
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
