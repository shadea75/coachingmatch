'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Users, 
  UserCheck, 
  LayoutDashboard, 
  Settings,
  LogOut,
  Shield,
  CreditCard,
  MessageSquare,
  ShoppingBag,
  TrendingUp,
  ExternalLink,
  PenSquare,
  Mail,
  Target,
  Menu,
  X
} from 'lucide-react'
import Logo from '@/components/Logo'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/contexts/AuthContext'

interface AdminLayoutProps {
  children: ReactNode
}

const ADMIN_MENU = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/leads', label: 'Lead', icon: Target },
  { href: '/admin/users', label: 'Utenti', icon: Users },
  { href: '/admin/coaches', label: 'Coach', icon: UserCheck },
  { href: '/admin/community', label: 'Community', icon: MessageSquare },
  { href: '/admin/offers', label: 'Offerte & Sessioni', icon: ShoppingBag },
  { href: '/admin/payments', label: 'Pagamenti', icon: CreditCard },
  { href: '/admin/email-broadcast', label: 'Email Broadcast', icon: Mail },
  { href: '/admin/settings', label: 'Impostazioni', icon: Settings },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, isAdmin } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  const SidebarNav = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <nav className="space-y-1">
        {ADMIN_MENU.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary-50 text-primary-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          )
        })}
        
        <div className="border-t border-gray-200 my-3"></div>
        
        <Link
          href="/community"
          onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink size={20} />
          <span>Vai alla Community</span>
        </Link>
        
        <Link
          href="/community/new"
          onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <PenSquare size={20} />
          <span>Scrivi un Post</span>
        </Link>
      </nav>
    </>
  )

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 fixed top-0 left-0 right-0 z-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 lg:gap-4">
              {/* Hamburger - mobile only */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Apri menu"
              >
                <Menu size={22} className="text-gray-600" />
              </button>
              <Logo size="sm" />
              <span className="text-gray-300 hidden sm:inline">|</span>
              <div className="hidden sm:flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-500" />
                <h1 className="font-semibold text-charcoal">
                  {isAdmin ? 'Admin' : 'Moderatore'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4">
              <span className="text-sm text-gray-500 hidden lg:inline">{user?.email}</span>
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 hidden sm:inline">
                Vai al sito →
              </Link>
            </div>
          </div>
        </header>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-50 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <aside
          className={`lg:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col transform transition-transform duration-300 ease-in-out shadow-xl ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Drawer header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-500" />
              <span className="font-semibold text-charcoal">
                {isAdmin ? 'Admin' : 'Moderatore'}
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Chiudi menu"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Drawer nav - scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
          </div>

          {/* Drawer footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="px-4 py-2 mb-2">
              <p className="text-sm font-medium text-charcoal">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors"
            >
              <LogOut size={20} />
              Esci
            </button>
          </div>
        </aside>
        
        <div className="flex pt-16">
          {/* Desktop Sidebar - hidden on mobile/tablet */}
          <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] p-4 fixed left-0 top-16">
            <SidebarNav />
            
            {/* Desktop user info & logout */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="border-t border-gray-200 pt-4">
                <div className="px-4 py-2 mb-2">
                  <p className="text-sm font-medium text-charcoal">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors"
                >
                  <LogOut size={20} />
                  Esci
                </button>
              </div>
            </div>
          </aside>
          
          {/* Main Content - full width on mobile, offset on desktop */}
          <main className="flex-1 lg:ml-64 p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  )
}
