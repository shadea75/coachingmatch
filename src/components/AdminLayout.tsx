'use client'

import { ReactNode } from 'react'
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
  Mail
} from 'lucide-react'
import Logo from '@/components/Logo'
import AdminGuard from '@/components/AdminGuard'
import { useAuth } from '@/contexts/AuthContext'

interface AdminLayoutProps {
  children: ReactNode
}

const ADMIN_MENU = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
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
  
  const handleSignOut = async () => {
    await signOut()
    router.replace('/login')
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-500" />
                <h1 className="font-semibold text-charcoal">
                  {isAdmin ? 'Admin' : 'Moderatore'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{user?.email}</span>
              <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                Vai al sito →
              </Link>
            </div>
          </div>
        </header>
        
        <div className="flex pt-16">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-64px)] p-4 fixed left-0 top-16">
            <nav className="space-y-1">
              {ADMIN_MENU.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
              
              {/* Separatore */}
              <div className="border-t border-gray-200 my-3"></div>
              
              {/* Link alla Community pubblica */}
              <Link
                href="/community"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ExternalLink size={20} />
                <span>Vai alla Community</span>
              </Link>
              
              {/* Link per creare nuovo post */}
              <Link
                href="/community/new"
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <PenSquare size={20} />
                <span>Scrivi un Post</span>
              </Link>
            </nav>
            
            {/* User info & logout */}
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
          
          {/* Main Content */}
          <main className="flex-1 ml-64 p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  )
}
