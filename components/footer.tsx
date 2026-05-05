"use client"

import { Instagram, Linkedin, Github, Youtube, Twitch } from "lucide-react"
import Link from "next/link"

const SOCIALS = [
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Twitch, href: "#", label: "Twitch" },
]

export default function Footer() {
  return (
    <footer className="border-t border-primary/40 bg-background">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">ALW Media</span>
          <span className="mx-2 text-primary">—</span>
          <span className="italic">"Creativity is nothing but the way to solve new problems..."</span>
        </p>
        <div className="flex items-center gap-5">
          {SOCIALS.map(({ icon: Icon, href, label }) => (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Icon className="h-5 w-5" />
            </Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
