"use client"

import Link from 'next/link'
import { ZoomJudgeLogo } from '@/components/zoomjudge-logo'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Github,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Mail,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const navigation = {
  product: [
    { title: 'Demo', href: '/demo' },
    { title: 'Features', href: '#features' },
    { title: 'Pricing', href: '#pricing' },
    { title: 'Testimonials', href: '#testimonials' },
    { title: 'FAQ', href: '#faq' },
  ],
  resources: [
    { title: 'Docs', href: '/docs' },
    { title: 'Guides', href: '/guides' },
    { title: 'Changelog', href: '/changelog' },
    { title: 'Status', href: '/status' },
  ],
  company: [
    { title: 'About', href: '/about' },
    { title: 'Careers', href: '/careers' },
    { title: 'Contact', href: 'mailto:support@zoomjudge.com' },
    { title: 'Newsletter', href: '#newsletter' },
  ],
}

const social = [
  { name: 'Twitter', href: 'https://x.com/', icon: Twitter },
  { name: 'LinkedIn', href: 'https://linkedin.com/', icon: Linkedin },
  { name: 'GitHub', href: 'https://github.com/', icon: Github },
  { name: 'Instagram', href: 'https://instagram.com/', icon: Instagram },
  { name: 'YouTube', href: 'https://youtube.com/', icon: Youtube },
]

interface MobileFooterProps {
  className?: string
  variant?: 'compact' | 'full'
}

export function MobileFooter({ className, variant = 'compact' }: MobileFooterProps) {
  const [openSections, setOpenSections] = useState<string[]>([])

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  if (variant === 'compact') {
    return (
      <footer className={cn(
        "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "mobile-safe-area",
        className
      )}>
        <div className="px-4 py-4">
          {/* Compact brand */}
          <div className="flex items-center justify-between mb-4">
            <Link href="/" aria-label="ZoomJudge home" className="flex items-center gap-2">
              <ZoomJudgeLogo variant="icon" size="sm" />
              <span className="text-sm font-semibold">ZoomJudge</span>
            </Link>
            <div className="flex items-center gap-2">
              {social.slice(0, 3).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.name}
                  className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors touch-target">
                  <item.icon className="size-3" />
                </Link>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs mb-3">
            <Link href="/terms" className="text-muted-foreground hover:text-foreground touch-target">Terms</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground touch-target">Privacy</Link>
            <Link href="/status" className="text-muted-foreground hover:text-foreground touch-target">Status</Link>
            <Link href="mailto:support@zoomjudge.com" className="text-muted-foreground hover:text-foreground touch-target">Contact</Link>
          </div>

          {/* Copyright */}
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} ZoomJudge. All rights reserved.
          </p>
        </div>
      </footer>
    )
  }

  return (
    <footer className={cn(
      "border-t bg-background",
      "mobile-safe-area",
      className
    )}>
      <div className="px-4 py-6 space-y-6">
        {/* Brand section */}
        <div className="text-center">
          <Link href="/" aria-label="ZoomJudge home" className="inline-flex items-center gap-2">
            <ZoomJudgeLogo variant="full" size="sm" />
          </Link>
          <p className="text-muted-foreground mt-2 text-xs">
            Objective scoring, deep insights, and beautiful reports.
          </p>
        </div>

        {/* Social links */}
        <div className="flex items-center justify-center gap-3">
          {social.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.name}
              className="text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-md border transition-colors touch-target">
              <item.icon className="size-4" />
            </Link>
          ))}
        </div>

        {/* Collapsible navigation sections */}
        <div className="space-y-2">
          {Object.entries(navigation).map(([key, items]) => {
            const isOpen = openSections.includes(key)
            const sectionTitle = key.charAt(0).toUpperCase() + key.slice(1)
            
            return (
              <Collapsible key={key} open={isOpen} onOpenChange={() => toggleSection(key)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-auto py-3 px-0 text-sm font-semibold"
                  >
                    {sectionTitle}
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pb-2">
                  {items.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="block py-2 text-sm text-muted-foreground hover:text-foreground touch-target"
                    >
                      {item.title}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </div>

        {/* Contact */}
        <div className="text-center">
          <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
            <Mail className="size-4" />
            <Link href="mailto:support@zoomjudge.com" className="hover:text-foreground underline-offset-4 hover:underline">
              support@zoomjudge.com
            </Link>
          </div>
        </div>

        {/* Legal links and copyright */}
        <div className="space-y-3 text-center">
          <nav className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <Link href="/terms" className="text-muted-foreground hover:text-foreground touch-target">Terms</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground touch-target">Privacy</Link>
            <Link href="/changelog" className="text-muted-foreground hover:text-foreground touch-target">Changelog</Link>
            <Link href="/status" className="text-muted-foreground hover:text-foreground touch-target">Status</Link>
          </nav>
          
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ZoomJudge. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
