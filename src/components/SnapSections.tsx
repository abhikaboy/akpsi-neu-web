import React, { useRef, useEffect, useState } from 'react'
import landingImage from '../assets/landing.png'
import patternImage from '../assets/pattern-720p-16x9.png'
import Navigation from './Navigation'
import { type Asset, urlFor } from '../lib/sanity'

interface SnapSectionsProps {
  onSnapComplete?: () => void
  assets?: Asset[]
  globalAssets?: Asset[]
  loading?: boolean
  error?: string | null
}

export const SnapSections: React.FC<SnapSectionsProps> = ({ onSnapComplete, assets, globalAssets, loading, error }) => {
  const northeasternRef = useRef<HTMLDivElement>(null)
  const [vectorPosition, setVectorPosition] = useState({ x: 0, y: 0 })

  // Debug: Log assets to help troubleshoot
  useEffect(() => {
    console.log('SnapSections assets:', assets)
    console.log('SnapSections globalAssets:', globalAssets)
    const businessLeadersAsset = assets?.find(asset => asset.title.toLowerCase() === 'business-leaders') ||
                                 globalAssets?.find(asset => asset.title.toLowerCase() === 'business-leaders')
    console.log('Found business-leaders asset:', businessLeadersAsset)
    if (businessLeadersAsset?.picture) {
      console.log('Generated image URL:', urlFor(businessLeadersAsset.picture).width(642).height(401).url())
    }
  }, [assets, globalAssets])

  // Vector positioning effect
  useEffect(() => {
    const updateVectorPosition = () => {
      if (northeasternRef.current) {
        const rect = northeasternRef.current.getBoundingClientRect()
        setVectorPosition({
          x: rect.right + 0, // 20px to the right of the text
          y: rect.top - 5 // middle of the text (same level)
        })
      }
    }

    updateVectorPosition()
    window.addEventListener('resize', updateVectorPosition)
    return () => window.removeEventListener('resize', updateVectorPosition)
  }, [])

  // Parallax effect for About Us section
  useEffect(() => {
    const aboutUsSection = document.querySelector('.about-us-section')
    const parallaxBackground = document.querySelector('.parallax-background')
    
    if (!aboutUsSection || !parallaxBackground) return

    const handleScroll = () => {
      const rect = aboutUsSection.getBoundingClientRect()
      const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
      const translateY = scrollProgress * 100 // Adjust this value for parallax intensity
      
      ;(parallaxBackground as HTMLElement).style.transform = `translateY(${translateY}px)`
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <>
      {/* Hero Section */}
      <div className="relative h-[100%] overflow-hidden snap-start">
        {/* Background Image with Gradient Overlay */}
        <Navigation currentPage="About" mode="light" />

        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{
            backgroundPositionY: '100%',
            backgroundImage: `linear-gradient(187.806deg, rgba(0, 0, 0, 0) 45.836%, rgb(13, 47, 86) 85.508%), linear-gradient(90deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.55) 100%), url(${landingImage})`
          }}
        />
        
        {/* Header - Northeastern University */}
        <div className="absolute top-0 right-0 z-10 p-4 sm:p-8">
          <div ref={northeasternRef} className="text-white font-['PP_Editorial_New'] text-base">
            Northeastern University
          </div>
        </div>

        {/* Vector Element - Following Figma Design */}
        <div className="absolute inset-0 z-10">
          {/* Horizontal line at the same height as "Northeastern University" */}
          <div 
            className="absolute bg-white"
            style={{
              left: '10%',
              top: vectorPosition.y + 15,
              height: '1px',
              width: '70%'
            }}
          />
          {/* Vertical line to the right of "Northeastern University" */}
          <div 
            className="absolute bg-white"
            style={{
              top: vectorPosition.y + 40,
              bottom: "15%",
              left: vectorPosition.x - 5,
              width: '1px'
            }}
          />
        </div>

        {/* Main Hero Content - Following Figma Design */}
        <div className="absolute font-['PP_Editorial_New'] leading-none left-8 not-italic text-white text-[17vw] text-nowrap bottom-[10%] whitespace-pre" style={{ letterSpacing: '-4.4px' }}>
          <p className="mb-0">ALPHA </p>
          <p>KAPPA PSI</p>
        </div>

        {/* Bottom Text - Following Figma Design */}
        <div className="absolute font-['PP_Editorial_New'] leading-[0] left-8 not-italic text-[#e5c26c] text-[24px] text-nowrap bottom-[5%]">
          <p className="leading-[normal] whitespace-pre">CHI SIGMA CHAPTER</p>
        </div>
        <div className="absolute font-['PP_Editorial_New'] leading-[0] right-8 not-italic text-[#e5c26c] text-[24px] text-nowrap bottom-[5%]">
          <p className="leading-[normal] whitespace-pre">EST 2013</p>
        </div>
      </div>

      {/* Rush Video Section */}
      <div className="h-screen snap-start">
        <video 
          className="w-full h-full object-cover"
          autoPlay 
          muted
          loop 
          playsInline
          controls={false}
        >
          <source src="/src/assets/rushvideof25.MOV" type="video/quicktime" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* About Us Section - Blue Background */}
      <div className="about-us-section bg-[#000000] py-16 sm:py-32 px-8 snap-start min-h-screen relative overflow-hidden">
        {/* Parallax Background */}
        <div className="parallax-background absolute inset-0 bg-[#000000] transform translate-y-0 transition-transform duration-1000 ease-out">
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <p className="text-[#c4c4c4] text-sm font-['Avenir:Roman'] font-normal mb-16">(About Us)</p>
            
            <div className="mb-16">
              <p className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['PP_Editorial_New'] leading-[1.1] max-w-4xl mx-auto" style={{ letterSpacing: '-0.96px' }}>
                For the past 12 years, Alpha Kappa Psi's Chi Sigma chapter has been shaping the business leaders of tomorrow
              </p>
            </div>

            {/* About Us Block with black background and pattern overlays */}
            <div className="relative w-full bg-black py-32 px-8 overflow-hidden">
              {/* Pattern overlays with screen blend mode - positioned as in Figma */}
              <div 
                className="absolute w-[122vw] h-[68.625vw] bg-no-repeat"
                style={{
                  left: '10.94vw',
                  top: '0vw',
                  backgroundImage: `url('${patternImage}')`,
                  backgroundSize: '83.65% 83.62%',
                  backgroundPosition: '-0.15% 100%',
                  opacity: 0.25,
                  mixBlendMode: 'screen',
                  filter: 'brightness(1.5) contrast(1.2)'
                }}
              />
              <div 
                className="absolute w-[122vw] h-[68.625vw] bg-no-repeat"
                style={{
                  left: '0.69vw',
                  top: '41.69vw',
                  backgroundImage: `url('${patternImage}')`,
                  backgroundSize: '83.65% 83.62%',
                  backgroundPosition: '-0.15% 100%',
                  opacity: 0.25,
                  mixBlendMode: 'screen',
                  filter: 'brightness(1.5) contrast(1.2)'
                }}
              />
              <div 
                className="absolute w-[122vw] h-[68.625vw] bg-no-repeat"
                style={{
                  left: '-44.13vw',
                  top: '-0.31vw',
                  backgroundImage: `url('${patternImage}')`,
                  backgroundSize: '83.65% 83.62%',
                  backgroundPosition: '-0.15% 100%',
                  opacity: 0.25,
                  mixBlendMode: 'screen',
                  filter: 'brightness(1.5) contrast(1.2)'
                }}
              />
              
              {/* Content container */}
              <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center gap-16">
                {/* Image container with responsive sizing */}
                <div className="relative w-full max-w-[min(80vw,642px)]">
                  <div className="absolute border-[1.5vw] md:border-[12px] border-white inset-[-1.5vw] md:inset-[-12px] pointer-events-none z-10"></div>
                  <div className="bg-bottom bg-no-repeat bg-cover w-full aspect-[642/401] relative"
                       style={{
                         backgroundImage: `url('${
                           (() => {
                             const businessLeadersAsset = assets?.find(asset => asset.title.toLowerCase() === 'business-leaders') ||
                                                         globalAssets?.find(asset => asset.title.toLowerCase() === 'business-leaders')
                             if (businessLeadersAsset?.picture) {
                               return urlFor(businessLeadersAsset.picture).width(642).height(401).url()
                             }
                             return 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80'
                           })()
                         }')`
                       }}>
                    <div className="absolute border-[1vw] md:border-8 border-[#03345f] inset-[-1vw] md:inset-[-8px] pointer-events-none"></div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-['PP_Editorial_New'] leading-[1.1] max-w-4xl mx-auto" style={{ letterSpacing: '-0.96px' }}>
              We're the premier business fraternity at Northeastern University open to all majors.
            </p>
          </div>
          
          <div className="text-center">
            <p className="text-[#c4c4c4] text-sm font-['Avenir:Roman'] font-normal">(Continued)</p>
          </div>
        </div>
      </div>
    </>
  )
}
