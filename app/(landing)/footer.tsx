import Link from 'next/link'
import { ZoomJudgeLogo } from '@/components/zoomjudge-logo'
import { ThemeToggle } from '@/components/theme-toggle'
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
    { title: 'Contact', href: 'mailto:hello@zoomjudge.ai' },
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
    <footer className="relative border-t">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand + Social */}
          <div className="md:col-span-5 lg:col-span-4">
            <Link href="/" aria-label="ZoomJudge home" className="inline-flex items-center gap-2">
              <ZoomJudgeLogo variant="full" size="md" />
            </Link>
            <p className="text-muted-foreground mt-4 max-w-sm text-sm">
              Objective scoring, deep insights, and beautiful reports.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {social.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={item.name}
                  className="text-muted-foreground hover:text-foreground inline-flex size-9 items-center justify-center rounded-md border transition-colors">
                  <item.icon className="size-4" />
                </Link>
              ))}
            </div>
            <div className="text-muted-foreground mt-5 flex items-center gap-2 text-sm">
              <Mail className="size-4" />
              <Link href="mailto:hello@zoomjudge.ai" className="hover:text-foreground underline-offset-4 hover:underline">
                hello@zoomjudge.ai
              </Link>
            </div>
          </div>

          {/* Link groups */}
          <div className="md:col-span-7 lg:col-span-8">
            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:gap-10">
              <div>
                <h3 className="text-sm font-semibold">Product</h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {navigation.product.map((item) => (
                    <li key={item.title}>
                      <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Resources</h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {navigation.resources.map((item) => (
                    <li key={item.title}>
                      <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <h3 className="text-sm font-semibold">Company</h3>
                <ul className="mt-4 space-y-2 text-sm">
                  {navigation.company.map((item) => (
                    <li key={item.title}>
                      <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Newsletter + Preferences
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
            </div> */}
          </div>
        </div>

        <div className="mt-10 border-t pt-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-muted-foreground text-xs md:text-sm">
              © {new Date().getFullYear()} ZoomJudge. All rights reserved.
            </p>
            <nav className="flex flex-wrap items-center justify-center gap-4 text-xs md:text-sm">
              <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
              <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
              <Link href="/changelog" className="text-muted-foreground hover:text-foreground">Changelog</Link>
              <Link href="/status" className="text-muted-foreground hover:text-foreground">Status</Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}
