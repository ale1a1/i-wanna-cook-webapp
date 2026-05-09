"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChefHat, Search, User, ClipboardList, LogOut, Menu, X, ShoppingCart, Sun, Moon, Heart } from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/redux/hooks"
import { selectAuth, logout } from "@/redux/features/auth/authSlice"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"

export default function Header() {
  const { user } = useAppSelector(selectAuth)
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem("user")
      if (saved) {
        const u = JSON.parse(saved)
        if (u.theme && setTheme) setTheme(u.theme)
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { setMobileMenuOpen(false) }, [pathname])

  const handleLogout = () => {
    dispatch(logout())
    localStorage.removeItem("user")
    router.push("/login")
    setMobileMenuOpen(false)
  }

  const backdrop = mounted && mobileMenuOpen
    ? createPortal(
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-md md:hidden"
          style={{ zIndex: 45, top: "53px" }}
          onClick={() => setMobileMenuOpen(false)}
        />,
        document.body
      )
    : null

  return (
    <>
      {backdrop}
      <header className="border-b border-primary/40 relative z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ChefHat className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">What Should I Cook?</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/search" className={pathname === "/search" ? "text-primary" : ""}>
              <Button variant="ghost" size="sm" className="flex items-center">
                <Search className="h-5 w-5 mr-1" />
                <span>Search Recipes</span>
              </Button>
            </Link>

            {user ? (
              <>
                <Link href="/favourites" className={pathname === "/favourites" ? "text-primary" : ""}>
                  <Button variant="ghost" size="sm" className="flex items-center">
                    <Heart className="h-5 w-5 mr-1" />
                    <span>Favourites</span>
                  </Button>
                </Link>

                <Link href="/tried-recipes" className={pathname === "/tried-recipes" ? "text-primary" : ""}>
                  <Button variant="ghost" size="sm" className="flex items-center">
                    <ClipboardList className="h-5 w-5 mr-1" />
                    <span>Tried Recipes</span>
                  </Button>
                </Link>

                <Link href="/shopping-list" className={pathname === "/shopping-list" ? "text-primary" : ""}>
                  <Button variant="ghost" size="sm" className="flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-1" />
                    <span>Shopping List</span>
                  </Button>
                </Link>

                <Link href="/profile" className={pathname === "/profile" ? "text-primary" : ""}>
                  <Button variant="ghost" size="sm" className="flex items-center">
                    <User className="h-5 w-5 mr-1" />
                    <span>Profile</span>
                  </Button>
                </Link>

                {mounted && (
                  <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                )}

                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-destructive">
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <>
                {mounted && (
                  <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                )}
                <Link href="/login">
                  <Button>Login</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-1">
            {mounted && (
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b shadow-lg z-50">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              <Link href="/search" className={pathname === "/search" ? "text-primary" : ""}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Search className="h-5 w-5 mr-2" />
                  Search Recipes
                </Button>
              </Link>

              {user ? (
                <>
                  <Link href="/favourites" className={pathname === "/favourites" ? "text-primary" : ""}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <Heart className="h-5 w-5 mr-2" />
                      Favourites
                    </Button>
                  </Link>

                  <Link href="/tried-recipes" className={pathname === "/tried-recipes" ? "text-primary" : ""}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <ClipboardList className="h-5 w-5 mr-2" />
                      Tried Recipes
                    </Button>
                  </Link>

                  <Link href="/shopping-list" className={pathname === "/shopping-list" ? "text-primary" : ""}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Shopping List
                    </Button>
                  </Link>

                  <Link href="/profile" className={pathname === "/profile" ? "text-primary" : ""}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <User className="h-5 w-5 mr-2" />
                      Profile
                    </Button>
                  </Link>

                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive justify-start">
                    <LogOut className="h-5 w-5 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button className="w-full">Login</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  )
}
