import Navigation from './Navigation'

interface LoadingScreenProps {
  currentPage: string
  /** number of card placeholders in the grid */
  cards?: number
}

// Shimmer skeleton that mirrors the card-grid layout of the content pages.
// Standard modern loading pattern — reads as "content is arriving here".
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ currentPage, cards = 6 }) => (
  <div className="bg-white relative min-h-screen">
    <Navigation currentPage={currentPage} />
    <div className="pt-20 sm:pt-24 px-8 py-16 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Title placeholder */}
        <div className="skeleton h-9 w-64 rounded mb-3" />
        <div className="skeleton h-4 w-40 rounded mb-12" />

        {/* Card grid placeholder */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="rounded-lg overflow-hidden border border-gray-100">
              <div className="skeleton aspect-[4/5]" />
              <div className="p-4 space-y-3">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

export default LoadingScreen
