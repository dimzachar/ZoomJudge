import Link from 'next/link'
import { ZoomJudgeLogo } from '@/components/zoomjudge-logo'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Github,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Globe,
  Mail
} from 'lucide-react'

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

export default function FooterSection() {
  return (
    <footer className="relative border-t mobile-safe-area">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 lg:py-16">
        {/* Mobile-first layout */}
        <div className="space-y-6 sm:space-y-8">

          {/* Mobile: Compact brand section */}
          <div className="text-center sm:text-left">
            <Link href="/" aria-label="ZoomJudge home" className="inline-flex items-center gap-2 justify-center sm:justify-start">
              <ZoomJudgeLogo variant="full" size="sm" className="sm:size-md" />
            </Link>
            <p className="text-muted-foreground mt-2 text-xs sm:text-sm md:text-base max-w-sm mx-auto sm:mx-0">
              Objective scoring, deep insights, and beautiful reports.
            </p>
          </div>

          {/* Mobile: Horizontal social links */}
          <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
            {social.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.name}
                className="text-muted-foreground hover:text-foreground inline-flex size-8 sm:size-9 items-center justify-center rounded-md border transition-colors touch-target">
                <item.icon className="size-3 sm:size-4" />
              </Link>
            ))}
          </div>

          {/* Mobile: Contact info */}
          <div className="text-center sm:text-left">
            <div className="text-muted-foreground flex items-center justify-center sm:justify-start gap-2 text-xs sm:text-sm">
              <Mail className="size-3 sm:size-4" />
              <Link href="mailto:support@zoomjudge.com" className="hover:text-foreground underline-offset-4 hover:underline">
                support@zoomjudge.com
              </Link>
            </div>
          </div>

          {/* Mobile: Collapsible navigation sections */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 md:grid-cols-3 lg:gap-10">
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-2 sm:mb-3">Product</h3>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                {navigation.product.map((item) => (
                  <li key={item.title}>
                    <Link href={item.href} className="text-muted-foreground hover:text-foreground block py-1 touch-target">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-2 sm:mb-3">Resources</h3>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                {navigation.resources.map((item) => (
                  <li key={item.title}>
                    <Link href={item.href} className="text-muted-foreground hover:text-foreground block py-1 touch-target">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-2 sm:mb-3">Company</h3>
              <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                {navigation.company.map((item) => (
                  <li key={item.title}>
                    <Link href={item.href} className="text-muted-foreground hover:text-foreground block py-1 touch-target">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter + Preferences - Commented out for now
          <div id="newsletter" className="mt-10 rounded-lg border p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Get product updates</h3>
                <p className="text-muted-foreground mt-1 text-sm">Join our monthly newsletter. No spam, unsubscribe anytime.</p>
              </div>
              <div className="w-full max-w-md">
                <form className="flex gap-2" action="#" method="post">
                  <label htmlFor="newsletter-email" className="sr-only">Email</label>
                  <Input id="newsletter-email" type="email" placeholder="you@company.com" required aria-label="Email address" />
                  <Button type="submit">Subscribe</Button>
                </form>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2"><Globe className="size-4" /> EN</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>English</DropdownMenuItem>
                  <DropdownMenuItem>Deutsch</DropdownMenuItem>
                  <DropdownMenuItem>Español</DropdownMenuItem>
                  <DropdownMenuItem>Français</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ThemeToggle />
            </div>
          </div>
          */}
        </div>

        {/* Mobile: Compact bottom section */}
        <div className="mt-6 sm:mt-8 md:mt-10 border-t pt-4 sm:pt-6">
          <div className="flex flex-col items-center gap-3 sm:gap-4 sm:flex-row sm:justify-between">
            {/* Mobile: Legal links first (more important on mobile) */}
            <nav className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm order-2 sm:order-1">
              <Link href="/terms" className="text-muted-foreground hover:text-foreground touch-target">Terms</Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground touch-target">Privacy</Link>
              <Link href="/changelog" className="text-muted-foreground hover:text-foreground touch-target">Changelog</Link>
              <Link href="/status" className="text-muted-foreground hover:text-foreground touch-target">Status</Link>
            </nav>

            {/* Mobile: Copyright smaller and less prominent */}
            <p className="text-muted-foreground text-xs sm:text-sm order-1 sm:order-2">
              © {new Date().getFullYear()} ZoomJudge. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
