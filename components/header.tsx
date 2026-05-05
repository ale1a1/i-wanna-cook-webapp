"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { ChefHat, Moon, Search, Sun, User, ClipboardList, LogOut, Menu, X } from "lucide-react"
import { useAppSelector, useAppDispatch } from "@/redux/hooks"
import { selectAuth, logout } from "@/redux/features/auth/authSlice"
import { usePathname, useRouter } from "next/navigation"

export default function Header() {
  const { theme, setTheme } = useTheme()
  const { user } = useAppSelector(selectAuth)
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Ensure component is mounted before accessing theme
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = () => {
    dispatch(logout())
    localStorage.removeItem("user")
    router.push("/login")
    setMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <header className="border-b border-primary/40 relative z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">What Should I Cook?</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-2">
          <>
            <Link href="/search" className={pathname === "/search" ? "text-primary" : ""}>
              <Button variant="ghost" size="sm" className="flex items-center">
                <Search className="h-5 w-5 mr-1" />
                <span>Search Recipes</span>
              </Button>
            </Link>

            {user ? (
              <>
                <Link href="/tried-recipes" className={pathname === "/tried-recipes" ? "text-primary" : ""}>
                  <Button variant="ghost" size="sm" className="flex items-center">
                    <ClipboardList className="h-5 w-5 mr-1" />
                    <span>Tried Recipes</span>
                  </Button>
                </Link>

                <Link href="/profile" className={pathname === "/profile" ? "text-primary" : ""}>
                  <Button variant="ghost" size="sm" className="flex items-center">
                    <User className="h-5 w-5 mr-1" />
                    <span>Profile</span>
                  </Button>
                </Link>

                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    aria-label="Toggle theme"
                  >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                )}

                <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive flex items-center">
                  <LogOut className="h-5 w-5 mr-1" />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <>
                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    aria-label="Toggle theme"
                  >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                )}

                <Link href="/login">
                  <Button>Login</Button>
                </Link>
              </>
            )}
          </>
        </div>

        {/* Mobile Menu Button and Theme Toggle */}
        <div className="md:hidden flex items-center gap-1">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b shadow-lg z-50">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
            <>
              <Link href="/search" className={pathname === "/search" ? "text-primary" : ""}>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Search className="h-5 w-5 mr-2" />
                  <span>Search Recipes</span>
                </Button>
              </Link>

              {user ? (
                <>
                  <Link href="/tried-recipes" className={pathname === "/tried-recipes" ? "text-primary" : ""}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <ClipboardList className="h-5 w-5 mr-2" />
                      <span>Tried Recipes</span>
                    </Button>
                  </Link>

                  <Link href="/profile" className={pathname === "/profile" ? "text-primary" : ""}>
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <User className="h-5 w-5 mr-2" />
                      <span>Profile</span>
                    </Button>
                  </Link>

                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive justify-start">
                    <LogOut className="h-5 w-5 mr-2" />
                    <span>Logout</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button className="w-full">Login</Button>
                  </Link>
                </>
              )}
            </>
          </div>
        </div>
      )}
    </header>
  )
}
