import { Outlet, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanstackDevtools } from '@tanstack/react-devtools'

import Footer from '../components/Footer'
import { Toaster } from '../components/ui/sonner'

function RootComponent() {
  const location = useLocation()
  const isRushPage = location.pathname === '/rush'

  return (
    <>
      <main className="min-h-screen">
        <Outlet />
      </main>
      {!isRushPage && <Footer />}
      <Toaster position="bottom-right" />
    </>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
})
