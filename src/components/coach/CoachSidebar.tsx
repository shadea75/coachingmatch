'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  Video,
  Building2,
  Star,
  Trophy,
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Package
} from 'lucide-react'
import Logo from '@/components/Logo'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: number
}

interface CoachSidebarProps {
  coachName?: string
  coachLevel?: string
  pendingSessions?: number
  pendingReviews?: number
}

export default function CoachSidebar({ 
  coachName = 'Coach',
  coachLevel = 'Rookie',
  pendingSessions = 0,
  pendingReviews = 0
}: CoachSidebarProps) {
  const pathname = usePathname()
  const { signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems: NavItem[] = [
    { href: '/coach/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/coach/sessions', label: 'Sessioni', icon: Video, badge: pendingSessions },
    { href: '/coach/office', label: 'Ufficio Virtuale', icon: Building2 },
    { href: '/coach/office/products', label: 'Prodotti Digitali', icon: Package },
    { href: '/coach/reviews', label: 'Recensioni', icon: Star, badge: pendingReviews },
    { href: '/community/my-points', label: 'I miei punti', icon: Trophy },
    { href: '/coach/availability', label: 'Disponibilità', icon: Calendar },
    { href: '/community', label: 'Community', icon: Users },
    { href: '/coach/settings', label: 'Impostazioni', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/coach/dashboard') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const NavContent = () => (
    <>
      {/* Logo e info coach */}
      <div className="p-4 border-b border-gray-100">
        <Link href="/coach/dashboard">
          <Logo size="sm" />
        </Link>
        <div className="mt-4">
          <p className="text-xs text-gray-400">Coach</p>
          <p className="font-semibold text-charcoal truncate">{coachName}</p>
          <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
            🌱 {coachLevel}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                active
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Esci</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-white border-r border-gray-200 z-40">
        <NavContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/coach/dashboard">
            <Logo size="sm" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col shadow-xl"
            >
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for mobile header */}
      <div className="lg:hidden h-16" />
      
      {/* Spacer for desktop sidebar */}
      <div className="hidden lg:block lg:w-64 lg:flex-shrink-0" />
    </>
  )
}
