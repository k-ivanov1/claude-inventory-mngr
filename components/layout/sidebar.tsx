'use client'

import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileBarChart,
  Settings,
  Users,
  LogOut,
  PackageOpen,
  Clipboard,
  Coffee,
  ChevronLeft,
  Menu
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@/contexts/sidebar-context'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sales', href: '/dashboard/sales', icon: ShoppingCart },
  { name: 'Products', href: '/dashboard/products', icon: Coffee },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Package },
  { name: 'Stock Receiving', href: '/dashboard/stock/receive', icon: PackageOpen },
  { name: 'Product Recipes', href: '/dashboard/recipes', icon: Clipboard },
  { name: 'Reports', href: '/dashboard/reports', icon: FileBarChart },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { isOpen, toggle } = useSidebar()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden" 
          onClick={toggle}
        />
      )}
    
      {/* Sidebar */}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <h1 className="text-xl font-semibold">Tea Inventory</h1>
            <button 
              onClick={toggle}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className={cn("transition-opacity duration-200", isOpen ? "opacity-100" : "opacity-0 lg:opacity-100")}>
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </nav>

          {/* Sign out button */}
          <div className="border-t p-3">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className={cn("transition-opacity duration-200", isOpen ? "opacity-100" : "opacity-0 lg:opacity-100")}>
                Sign out
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Toggle button for mobile */}
      <button
        onClick={toggle}
        className={cn(
          "fixed left-4 top-4 z-50 rounded-md bg-white p-2 shadow-md lg:hidden",
          isOpen && "hidden"
        )}
      >
        <Menu className="h-6 w-6 text-gray-700" />
      </button>
    </>
  )
}
