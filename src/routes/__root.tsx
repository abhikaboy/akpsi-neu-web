import { Outlet, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanstackDevtools } from '@tanstack/react-devtools'

import Footer from '../components/Footer'
import { Toaster } from '../components/ui/sonner'

function RootComponent() {
  const location = useLocation()
  const isRushPage = location.pathname === '/rush'
  const isAdminPage = location.pathname.startsWith('/admin')

  return (
    <>
      <main className="min-h-screen">
        <Outlet />
      </main>
      {!isRushPage && !isAdminPage && <Footer />}
      <Toaster position="bottom-right" />
    </>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
