import React, { useEffect, useState } from 'react'
import { Button } from './ui/button'
import ValueCard from './ValueCard'
import { PhosphorBooks } from './PhosphorBooks'
import { useNavigate } from '@tanstack/react-router'
import { type Asset, urlFor } from '../lib/sanity'

interface ScrollSectionsProps {
  assets?: Asset[]
  globalAssets?: Asset[]
  loading?: boolean
  error?: string | null
}

export const ScrollSections: React.FC<ScrollSectionsProps> = ({ assets, globalAssets, loading, error }) => {
  const navigate = useNavigate()
  const [logoImages, setLogoImages] = useState<{ src: string; alt: string }[]>([])

  // Dynamically load all logo images from the logos folder
  useEffect(() => {
    const loadLogos = async () => {
      try {
        // Use Vite's import.meta.glob to dynamically import all images in the logos folder
        const logoModules = import.meta.glob('../assets/logos/*.{png,jpg,jpeg,svg}', { eager: true })
        
        const logos = Object.entries(logoModules).map(([path, module]) => {
          // Extract filename from path for alt text
          const filename = path.split('/').pop()?.split('.')[0] || 'Company Logo'
          const altText = filename.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          
          return {
            src: (module as { default: string }).default,
            alt: altText
          }
        }).sort((a, b) => a.alt.localeCompare(b.alt)) // Sort alphabetically by alt text
        
        setLogoImages(logos)
      } catch (error) {
        console.error('Error loading logo images:', error)
      }
    }

    loadLogos()
  }, [])

  // Values configuration with different fallback images
  const valuesConfig = [
    {
      title: "Unity",
      description: "Our brothers stand together in our endeavors to achieve greatness and support each other",
      fallbackImage: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1498&q=80",
      textColor: "white" as const
    },
    {
      title: "Integrity",
      description: "Through thoughtful and honest practice, our brothers hold true to themselves and others",
      fallbackImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
      textColor: "white" as const
    },
    {
      title: "Service",
      description: "We are committed to serving our community and making a positive impact in the world around us",
      fallbackImage: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
      textColor: "white" as const
    },
    {
      title: "Knowledge",
      description: "We strive to be the best in all our professional and personal endeavors",
      fallbackImage: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
      textColor: "white" as const
    },
    {
      title: "Brotherhood",
      description: "The bonds we form extend beyond college, creating lifelong connections and mutual support",
      fallbackImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1632&q=80",
      textColor: "white" as const
    }
  ]

  // Function to get image URL from Sanity or fallback
  const getValueImageUrl = (valueTitle: string, fallbackUrl: string) => {
    const asset = assets?.find(asset => asset.title.toLowerCase() === valueTitle.toLowerCase()) ||
                  globalAssets?.find(asset => asset.title.toLowerCase() === valueTitle.toLowerCase())
    
    if (asset?.picture) {
      return urlFor(asset.picture).width(427).height(495).url()
    }
    return fallbackUrl
  }
  
  // Value cards horizontal scroll functionality
  useEffect(() => {
    const valueCardsContainer = document.querySelector('.value-cards-container')
    const valueCardsScroll = document.querySelector('.value-cards-scroll')
    
    if (!valueCardsContainer || !valueCardsScroll) return

    const handleWheel = (e: WheelEvent) => {
      const rect = valueCardsContainer.getBoundingClientRect()
      
      // Only intercept scroll when the bottom of the cards section is in view
      if (rect.bottom <= window.innerHeight && rect.bottom > 600) {
        const maxScrollX = valueCardsScroll.scrollWidth - valueCardsScroll.clientWidth
        const currentScrollX = valueCardsScroll.scrollLeft
        
        // If we're at the beginning and scrolling up, or at the end and scrolling down, allow normal scroll
        if ((currentScrollX <= 0 && e.deltaY < 0) || (currentScrollX >= maxScrollX && e.deltaY > 0)) {
          return
        }
        
        // Otherwise, scroll the cards horizontally
        e.preventDefault()
        valueCardsScroll.scrollLeft += e.deltaY
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      document.removeEventListener('wheel', handleWheel)
    }
  }, [])

  return (
    <>
      {/* Why Rush Section */}
      <div className="px-8 py-16 sm:py-32 border-b border-black">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Layout - Stacked and Center Aligned */}
          <div className="block md:hidden text-left space-y-8">
            <div className="font-['Avenir:Heavy'] leading-none not-italic text-black text-[28px] sm:text-[32px]" style={{ letterSpacing: '-0.72px' }}>
              <p className="mb-2">WHY RUSH ALPHA</p>
              <p>KAPPA PSI?</p>
            </div>
            
            <div className="font-['Avenir:Roman'] not-italic text-black text-[18px] sm:text-[20px]" style={{ letterSpacing: '-0.4px' }}>
              <p className="leading-[1.25] mb-8">From business and consulting to marketing, technology, and design, our brothers are emerging as transformative leaders who drive innovation and create positive change across every industry</p>
            </div>
            
            <Button 
              variant="outline" 
              size="lg"
              className="font-['Outfit'] text-black border-black hover:bg-black hover:text-white transition-colors"
              style={{ letterSpacing: '-0.32px' }}
              onClick={() => navigate({ to: '/brothers' })}
            >
              → Meet the brothers
            </Button>
          </div>

          {/* Desktop Layout - Grid */}
          <div className="hidden md:grid grid-cols-12 gap-5">
            {/* Left Column - Heading spans 3 columns */}
            <div className="col-span-3">
              <div className="font-['Avenir:Heavy'] leading-none not-italic relative text-black text-[36px] text-nowrap whitespace-pre" style={{ letterSpacing: '-0.72px' }}>
                <p className="mb-0">WHY RUSH ALPHA</p>
                <p>                    KAPPA PSI? </p>
              </div>
            </div>
            
            {/* Empty space - 5 columns */}
            <div className="col-span-5"></div>
            
            {/* Right Column - Content spans 4 columns */}
            <div className="col-span-4">
              <div className="font-['Avenir:Roman'] not-italic relative text-black text-[20px]" style={{ letterSpacing: '-0.4px' }}>
                <p className="leading-[1.25] mb-8">From business and consulting to marketing, technology, and design, our brothers are emerging as transformative leaders who drive innovation and create positive change across every industry</p>
              </div>
              
              <Button 
                variant="outline" 
                size="lg"
                className="font-['Outfit'] text-black border-black hover:bg-black hover:text-white transition-colors"
                style={{ letterSpacing: '-0.32px' }}
                onClick={() => navigate({ to: '/brothers' })}
              >
                → Meet the brothers
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Our Values Section */}
      <div className="px-8 py-16 sm:py-32">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-['PP_Editorial_New'] leading-none text-black text-left mb-16 text-4xl sm:text-6xl md:text-8xl lg:text-9xl xl:text-[128px]" style={{ letterSpacing: '-1.92px' }}>
            OUR VALUES
          </h2>
          
          {/* Mobile Layout - Vertical Stack */}
          <div className="block md:hidden space-y-6">
            {valuesConfig.map((value, index) => (
              <div key={value.title} className="w-full">
                <ValueCard
                  title={value.title}
                  description={value.description}
                  backgroundImage={getValueImageUrl(value.title, value.fallbackImage)}
                  textColor={value.textColor}
                  icon={<PhosphorBooks />}
                />
              </div>
            ))}
          </div>

          {/* Desktop Layout - Horizontal Scroll */}
          <div className="hidden md:block value-cards-container">
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide value-cards-scroll">
              {valuesConfig.map((value, index) => (
                <div key={value.title} className="flex-shrink-0 w-[427px]">
                  <ValueCard
                    title={value.title}
                    description={value.description}
                    backgroundImage={getValueImageUrl(value.title, value.fallbackImage)}
                    textColor={value.textColor}
                    icon={<PhosphorBooks />}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Shaping People Section - Hidden on Mobile */}
      <div className="md:block px-8 py-16 sm:py-32 border-b border-black">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-['Avenir:Book'] text-lg sm:text-xl text-black mb-16" style={{ letterSpacing: '-0.4px' }}>(we're shaping)</p>
          
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 mb-16">
            <div className="font-['Avenir:Heavy'] text-lg sm:text-xl text-black" style={{ letterSpacing: '-0.4px' }}>
              SHAPING PEOPLE
            </div>
            <div className="font-['Avenir:Heavy'] text-4xl sm:text-6xl md:text-8xl lg:text-[96px] text-black leading-[1.1] min-w-0" style={{ letterSpacing: '-1.92px' }}>
              <div>THE FUTURE</div>
              <div className="font-['PP_Editorial_New'] italic whitespace-nowrap" style={{ letterSpacing: '-1.92px' }}>BUSINESS LEADERS</div>
              <div>
                <span>OF </span>
                <span className="text-[#26364d]">TOMORROW</span>
              </div>
            </div>
            <div className="font-['Avenir:Heavy'] text-lg sm:text-xl text-black" style={{ letterSpacing: '-0.4px' }}>
              SHAPING BUSINESS
            </div>
          </div>
          
          <p className="font-['Avenir:Book'] text-lg sm:text-xl text-black" style={{ letterSpacing: '-0.4px' }}>for years, and years to come</p>
        </div>
      </div>

      {/* Company Logos Section */}
      <div className="px-8 py-8">
        <p className="font-['Avenir:Roman'] text-sm text-black mb-4">Catch our Brothers at:</p>
        <div className="flex flex-wrap gap-4">
          {/* Dynamically loaded company logos */}
          {logoImages.map((logo, index) => (
            <div 
              key={index}
              className="flex-1 min-w-0 basis-[calc(50%-0.5rem)] sm:basis-[calc(33.333%-0.667rem)] md:basis-[calc(25%-0.75rem)] h-20 md:h-12 sm:h-16 md:h-24 flex items-center justify-center bg-white rounded shadow-sm border border-gray-100 p-2 sm:p-4 hover:shadow-md transition-all duration-300"
            >
              <img 
                src={logo.src}
                alt={logo.alt}
                className="max-h-full max-w-full object-contain filter transition-all duration-300"
                loading="lazy"
              />
            </div>
          ))}
          
          {/* Loading state */}
          {logoImages.length === 0 && (
            <div className="text-sm text-gray-500">Loading company logos...</div>
          )}
        </div>
      </div>

    </>
  )
}
