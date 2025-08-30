import { createFileRoute, useNavigate } from '@tanstack/react-router'
import Navigation from '../components/Navigation'
import { Button } from '../components/ui/button'

export const Route = createFileRoute('/alumni')({
  component: Alumni,
})

function Alumni() {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate({ to: '/' })
  }

  return (
    <div className="bg-white relative min-h-screen">
      <Navigation currentPage="Alumni" />
      
      {/* Main Content */}
      <div className="pt-20 sm:pt-24 px-4 sm:px-8 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-8">
            <div 
              className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-8"
              style={{ fontFamily: 'var(--font-avenir-book)' }}
            >
              <p>This page is not publicly available yet! </p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={handleGoBack}
              variant="default" 
              size="lg"
              className="font-medium bg-[#0d2f56] text-white hover:bg-[#0d2f56]/90 transition-colors"
              style={{ fontFamily: 'var(--font-avenir)' }}
            >
              ← Go Back Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Alumni
