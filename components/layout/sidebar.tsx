// components/layout/sidebar.tsx

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
  Truck,
  ChevronLeft,
  Menu,
  ChevronDown,
  ChevronRight,
  Leaf,
  ShoppingBag,
  BarChart3,
  FileText,
  File,
  History,
  Award,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { useSidebar } from '@/contexts/sidebar-context'
import { useState } from 'react'

// Navigation item with optional submenu
interface NavItem {
  name: string
  href?: string
  icon: React.ElementType
  submenu?: NavItem[]
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { 
    name: 'Products', 
    icon: Package,
    submenu: [
      { name: 'Raw Materials', href: '/dashboard/products/raw-materials', icon: Leaf },
      { name: 'Product Recipes', href: '/dashboard/products/recipes', icon: Clipboard },
      { name: 'Final Products', href: '/dashboard/products/final-products', icon: ShoppingBag },
      { name: 'Inventory', href: '/dashboard/products/inventory', icon: BarChart3 },
    ]
  },
  { name: 'Sales', href: '/dashboard/sales', icon: ShoppingCart },
  {
    name: 'Stock',
    icon: PackageOpen,
    submenu: [
      { name: 'Stock In', href: '/dashboard/stock/receive', icon: PackageOpen },
      { name: 'Wastage', href: '/dashboard/stock/wastage', icon: Trash2 },
    ]
  },
  { 
    name: 'Compliance', 
    icon: FileText,
    submenu: [
      { name: 'Documents', href: '/dashboard/compliance/documents', icon: File },
      { name: 'Version Control', href: '/dashboard/compliance/versions', icon: History },
      { name: 'Accreditations', href: '/dashboard/compliance/accreditations', icon: Award },
    ]
  },
  { name: 'Reports', href: '/dashboard/reports', icon: FileBarChart },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Truck },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { isOpen, toggle } = useSidebar()
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    // Automatically expand Products menu if we're on a products page
    Products: pathname.includes('/dashboard/products'),
    // Also expand Traceability & Compliance menu if on a compliance page
    'Traceability & Compliance': pathname.includes('/dashboard/compliance')
  })

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleSubmenu = (name: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }))
  }

  const isActive = (href?: string, submenu?: NavItem[]) => {
    if (href) {
      return pathname === href || pathname.startsWith(`${href}/`)
    }
    if (submenu) {
      return submenu.some(item => 
        item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))
      )
    }
    return false
  }

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href, item.submenu)
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isExpanded = hasSubmenu && expandedMenus[item.name]

    return (
      <div key={item.name} className="space-y-1">
        {hasSubmenu ? (
          <>
            <button
              onClick={() => toggleSubmenu(item.name)}
              className={cn(
                'flex w-full items-center justify-between gap-x-3 rounded-lg px-3 py-2 text-sm font-medium',
                active
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <div className="flex items-center gap-x-3">
                <item.icon className="h-5 w-5 shrink-0" />
                <span className={cn("transition-opacity duration-200", isOpen ? "opacity-100" : "opacity-0 lg:opacity-100")}>
                  {item.name}
                </span>
              </div>
              <div className={cn("transition-opacity duration-200", isOpen ? "opacity-100" : "opacity-0 lg:opacity-100")}>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </button>
            
           {/* Submenu items */}
            {isExpanded && item.submenu && (
              <div className="ml-6 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                {item.submenu.map(subItem => (
                  <Link
                    key={subItem.name}
                    href={subItem.href || '#'}
                    className={cn(
                      'flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium',
                      isActive(subItem.href)
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    )}
                  >
                    <subItem.icon className="h-4 w-4 shrink-0" />
                    <span className={cn("transition-opacity duration-200", isOpen ? "opacity-100" : "opacity-0 lg:opacity-100")}>
                      {subItem.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <Link
            href={item.href || '#'}
            className={cn(
              'flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium',
              active
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className={cn("transition-opacity duration-200", isOpen ? "opacity-100" : "opacity-0 lg:opacity-100")}>
              {item.name}
            </span>
          </Link>
        )}
      </div>
    )
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
          <div className="flex h-16 items-center justify-between border-b dark:border-gray-700 px-4">
            <h1 className="text-xl font-semibold dark:text-white">Tea Inventory</h1>
            <button 
              onClick={toggle}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-300 hover:text-gray-700 lg:hidden"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map(renderNavItem)}
          </nav>

          {/* Sign out button */}
          <div className="border-t dark:border-gray-700 p-3">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-gray-800"
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
          "fixed left-4 top-4 z-50 rounded-md bg-white dark:bg-gray-900 p-2 shadow-md lg:hidden",
          isOpen && "hidden"
        )}
      >
        <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
      </button>
    </>
  )
}
