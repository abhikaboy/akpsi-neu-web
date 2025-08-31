import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import Navigation from '../components/Navigation'
import RushEventCard from '../components/RushEventCard'
import RushContentSection from '../components/RushContentSection'
import { getUpcomingRushEvents, getAssetsByPage, urlFor, type RushEvent, type Asset } from '../lib/sanity'

export const Route = createFileRoute('/rush')({
  component: Rush,
})

// Fallback data matching Figma design
const fallbackEvents: RushEvent[] = [
  {
    _id: 'fallback-1',
    name: 'Meet the Brothers #1',
    date: '2025-09-08T19:00:00Z',
    room: 'WVG 108',
    dresscode: 'casual',
    description: '',
    isActive: true
  },
  {
    _id: 'fallback-2',
    name: 'Meet the Brothers #2',
    date: '2025-09-10T19:00:00Z',
    room: 'WVG 108',
    dresscode: 'casual',
    description: '',
    isActive: true
  },
  {
    _id: 'fallback-3',
    name: 'Professional Workshop',
    date: '2025-09-12T18:30:00Z',
    room: 'Curry 203',
    dresscode: 'business_casual',
    description: '',
    isActive: true
  },
  {
    _id: 'fallback-4',
    name: 'Social Night',
    date: '2025-09-15T20:00:00Z',
    room: 'Student Center',
    dresscode: 'casual',
    description: '',
    isActive: true
  },
  {
    _id: 'fallback-5',
    name: 'Interview Day',
    date: '2025-09-18T17:00:00Z',
    room: 'Hayden Hall',
    dresscode: 'business_professional',
    description: '',
    isActive: true
  },
  {
    _id: 'fallback-6',
    name: 'Final Celebration',
    date: '2025-09-22T19:00:00Z',
    room: 'WVG 108',
    dresscode: 'semi_formal',
    description: '',
    isActive: true
  }
]

const contentSections = [
  {
    title: "Why Rush?",
    content: "This is a body of text that talks about why someone should potentially recruit for Alpha Kappa Psi professional business fraternity a really cool group of people on campus who do really cool things! yahoo!"
  },
  {
    title: "Who Should Get Involved?",
    content: "This is a body of text that talks about why someone should potentially recruit for Alpha Kappa Psi professional business fraternity a really cool group of people on campus who do really cool things! yahoo!"
  },
  {
    title: "Tips & Tricks",
    content: "This is a body of text that talks about why someone should potentially recruit for Alpha Kappa Psi professional business fraternity a really cool group of people on campus who do really cool things! yahoo!"
  }
]

function Rush() {
  const [rushEvents, setRushEvents] = useState<RushEvent[]>([])
  const [rushAssets, setRushAssets] = useState<Asset[]>([])
  const [globalAssets, setGlobalAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRushData = async () => {
      try {
        setLoading(true)
        console.log('Fetching rush events and assets...')
        
        // Fetch rush events, rush assets, and global assets in parallel
        const [events, rushData, globalData] = await Promise.all([
          getUpcomingRushEvents(),
          getAssetsByPage('rush'),
          getAssetsByPage('global')
        ])
        
        console.log('Fetched rush events:', events)
        console.log('Fetched rush assets:', rushData)
        console.log('Fetched global assets:', globalData)
        
        // Use Sanity data if available, otherwise fallback to Figma data
        setRushEvents(events.length > 0 ? events : fallbackEvents)
        setRushAssets(rushData)
        setGlobalAssets(globalData)
      } catch (err) {
        console.error('Error fetching rush data, using fallback data:', err)
        setRushEvents(fallbackEvents)
        setError('Using fallback data')
      } finally {
        setLoading(false)
      }
    }

    fetchRushData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white relative min-h-screen">
        <Navigation currentPage="Rush" />
        <div className="pt-20 sm:pt-24 px-8 py-16 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d2f56] mx-auto mb-4"></div>
            <p className="font-['Avenir:Roman'] text-black text-[16px]">Loading rush events...</p>
          </div>
        </div>
      </div>
    )
  }

    return (
    <div className="bg-white relative min-h-screen m-0 p-0">
      <Navigation currentPage="Rush" mode="light" />
      
      {/* Main Layout Container */}
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Desktop: Fixed Left Side - Image and RUSH text - 60% width */}
        {/* Mobile: Full screen hero section that scrolls */}
        <div className="relative md:fixed left-0 top-0 w-full md:w-[60vw] h-screen z-0">
          {/* Background Image with Gradient Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
                backgroundPositionY: '90%',
              backgroundImage: `linear-gradient(194.661deg, rgba(0, 0, 0, 0) 45.836%, rgb(13, 47, 86) 85.508%), linear-gradient(90deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.4) 100%), url('${
                (() => {
                  const rushBannerAsset = rushAssets.find(asset => asset.asset_type === 'image' && asset.title.toLowerCase().includes('rush-banner')) ||
                                         globalAssets.find(asset => asset.asset_type === 'image' && asset.title.toLowerCase().includes('rush-banner'))
                  if (rushBannerAsset?.picture) {
                    return urlFor(rushBannerAsset.picture).width(600).height(800).url()
                  }
                  return 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80'
                })()
              }')`
            }}
          />
          
          {/* FALL 2025 Text */}
          <div className="absolute top-20 sm:top-24 right-8 font-['Avenir:Roman'] text-[#e5c26c] text-[16px] leading-[2]">
            <p>FALL 2025</p>
          </div>
          
          {/* RUSH Text */}
          <div className="absolute bottom-[4px] left-[32px] font-['PP_Editorial_New'] text-white text-[100px] md:text-[164px] leading-none tracking-[-3.28px]">
            <p>RUSH</p>
          </div>
        </div>

        {/* Desktop: Right Side Content - Scrollable - 40% width */}
        {/* Mobile: Content below hero section */}
        <div className="w-full md:ml-[60vw] md:w-[40vw] pt-0">
          <div className="pl-8 pr-8 pt-20 md:pt-24 pb-16">
            {/* Content Sections with proper spacing */}
            <div className="space-y-[50px]">
              {contentSections.map((section, index) => (
                <RushContentSection
                  key={index}
                  title={section.title}
                  content={section.content}
                />
              ))}
              
              {/* Hesitant Text */}
              <div className="font-['Avenir:Roman'] text-[16px] text-black leading-none">
                <p>Hesitant? Just show up anyways!</p>
              </div>
            </div>

            {/* Recruitment Timeline Section */}
            <div className="mt-[90px]">
              <div className="mb-8">
                <h2 className="font-['PP_Editorial_New'] text-[24px] text-black tracking-[-0.48px] leading-none">
                  Recruitment Timeline
                </h2>
              </div>
              
              {/* Rush Events */}
              <div className="space-y-6">
                {rushEvents.map((event) => (
                  <RushEventCard key={event._id} event={event} />
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                Note: {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Extended Blue Background for Scroll */}
      <div className="bg-[#0d2f56] h-[2000px] w-full md:w-[60vw] fixed left-0 top-[1033px] -z-10"></div>
      
      {/* Additional Content Sections (Images/Cards) */}
      <div className="w-full md:ml-[60vw] relative">
        <div className="pl-6 pr-8 space-y-8 pb-32">
          {/* Dynamic Image Cards from Assets */}
          {rushAssets
            .filter(asset => asset.asset_type === 'image' && !asset.title.toLowerCase().includes('rush-banner'))
            .concat(globalAssets.filter(asset => asset.asset_type === 'image' && !asset.title.toLowerCase().includes('rush-banner')))
            .slice(0, 5) // Limit to 5 images
            .map((asset, index) => (
              <div 
                key={asset._id}
                className={`w-[299px] h-[170px] bg-cover bg-center border-[12px] border-white shadow-[0px_1px_8px_0px_rgba(0,0,0,0.15)] ${
                  index % 2 === 1 ? 'ml-16' : ''
                }`}
                style={{
                  backgroundImage: `url('${asset.picture ? urlFor(asset.picture).width(299).height(170).url() : ''}')`
                }}
                title={asset.title}
              />
            ))}
          
          {/* Fallback placeholder cards if no assets */}
          {rushAssets.filter(asset => asset.asset_type === 'image' && !asset.title.toLowerCase().includes('rush-banner')).length === 0 &&
           globalAssets.filter(asset => asset.asset_type === 'image' && !asset.title.toLowerCase().includes('rush-banner')).length === 0 &&
           [...Array(0)].map((_, index) => (
            <div 
              key={`fallback-${index}`}
              className={`w-[299px] h-[170px] bg-white shadow-[0px_1px_8px_0px_rgba(0,0,0,0.15)] ${
                index % 2 === 1 ? 'ml-16' : ''
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Rush
