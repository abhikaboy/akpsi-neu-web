import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import { getAssetsByPage, urlFor, type Asset } from '../lib/sanity'
import cscImage from '../assets/csc.png'

export const Route = createFileRoute('/consulting')({
  component: Consulting,
})

function Consulting() {
  const [consultingAssets, setConsultingAssets] = useState<Asset[]>([])
  const [globalAssets, setGlobalAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchConsultingData = async () => {
      try {
        setLoading(true)
        console.log('Fetching consulting assets...')
        
        const [consultingData, globalData] = await Promise.all([
          getAssetsByPage('consulting'),
          getAssetsByPage('global')
        ])
        
        console.log('Fetched consulting assets:', consultingData)
        console.log('Fetched global assets:', globalData)
        
        setConsultingAssets(consultingData)
        setGlobalAssets(globalData)
      } catch (err) {
        console.error('Error fetching consulting data:', err)
        setError('Failed to load consulting data')
      } finally {
        setLoading(false)
      }
    }

    fetchConsultingData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white relative min-h-screen">
        <Navigation currentPage="Chi Sigma Consulting" />
        <div className="pt-20 sm:pt-24 px-4 sm:px-8 py-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d2f56] mx-auto mb-4"></div>
            <p className="text-black text-sm sm:text-base" style={{ fontFamily: 'var(--font-avenir-roman)' }}>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black relative w-full" data-name="CSC" data-node-id="511:320">
      <Navigation currentPage="Chi Sigma Consulting" mode="light" />
      
      {/* Hero Section with Background Image */}
      <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-center bg-cover bg-no-repeat opacity-100" 
          style={{
            backgroundImage: `url('${
              (() => {
                // First try to use Sanity asset, fallback to local csc image
                const heroAsset = consultingAssets.find(asset => asset.asset_type === 'image' && asset.title.toLowerCase().includes('hero')) ||
                                 globalAssets.find(asset => asset.asset_type === 'image' && asset.title.toLowerCase().includes('hero'))
                if (heroAsset?.picture) {
                  return urlFor(heroAsset.picture).width(1280).height(854).url()
                }
                return cscImage
              })()
            }')`
          }}
        />
        
        {/* Hero Title */}
        <div 
          className="relative z-10 text-center text-white px-4 sm:px-8 max-w-6xl mx-auto" 
          data-node-id="511:323"
          style={{ fontFamily: 'var(--font-avenir-black)' }}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight font-black">
            CHI SIGMA CONSULTING
          </h1>
        </div>
      </div>

      {/* Who Are We Section */}
      <div 
        className="bg-[#0d2f56] flex flex-col items-center justify-center text-center text-white w-full py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-8 md:px-16 lg:px-32 xl:px-64" 
        data-node-id="511:324"
      >
        <div 
          className="mb-6 sm:mb-8" 
          data-node-id="511:325"
          style={{ fontFamily: 'var(--font-avenir-black)' }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight font-black">Who Are We?</h2>
        </div>
        <div 
          className="max-w-4xl mx-auto" 
          data-node-id="511:326"
          style={{ fontFamily: 'var(--font-avenir-book)' }}
        >
          <p className="text-base sm:text-md md:text-lg leading-relaxed">
            Chi Sigma Consulting is a pro-bono consulting group dedicated to delivering both impactful and lasting solutions for nonprofits in the Greater Boston Area. Our diverse group of Northeastern University students draws on experience that spans 8 disciplines, from investment banking to mechanical engineering. As aspiring consultants with a passion for problem solving, we seek opportunities to apply our knowledge and research to real business situations with the goal of adding tangible value for clients.
            <br /><br />
            We were founded by a group of motivated students who aim to bring positive impact to the greater Boston community. We share that passion for service and many of us have deeply rooted personal connections to the nonprofits and charities that we service.
          </p>
        </div>
      </div>

      {/* Meet the Team Section Header Only */}
      {/* <div 
        className="bg-[#fffffd] w-full py-12 sm:py-16 md:py-20 lg:py-24 flex items-center justify-center" 
        data-node-id="511:335"
      >
        <div 
          className="text-center text-black px-4 sm:px-8" 
          data-node-id="511:336"
          style={{ fontFamily: 'var(--font-avenir-black)' }}
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-tight font-black">Meet the Team</h2>
        </div>
      </div> */}

      {/* Error Message */}
      {error && (
        <div className="px-8 py-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              Note: {error}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Consulting
