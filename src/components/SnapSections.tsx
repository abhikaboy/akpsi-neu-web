import React, { useRef, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import landingImage from '../assets/landing.png'
import patternImage from '../assets/pattern-720p-16x9.png'
import rushVideoLocal from '../assets/rushvideof25.MOV?url'
import Navigation from './Navigation'
import { type Asset, type Copy, urlFor, getAssetByTitle, getCopyByTitle, getFileUrl, getImageUrlFromFileAsset, getVideoMimeType, listAllAssets } from '../lib/sanity'

interface SnapSectionsProps {
  onSnapComplete?: () => void
  assets?: Asset[]
  globalAssets?: Asset[]
  loading?: boolean
  error?: string | null
}

interface PaintedImage {
  id: string
  x: number
  y: number
  imageUrl: string
  timestamp: number
}

export const SnapSections: React.FC<SnapSectionsProps> = ({ onSnapComplete, assets, globalAssets, loading, error }) => {
  const northeasternRef = useRef<HTMLDivElement>(null)
  const videoSectionRef = useRef<HTMLDivElement>(null)
  const aboutUsSectionRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [vectorPosition, setVectorPosition] = useState({ x: 0, y: 0 })
  const [hasShownToast, setHasShownToast] = useState(false)
  const [galleryAssets, setGalleryAssets] = useState<Asset[]>([])
  const [paintedImages, setPaintedImages] = useState<PaintedImage[]>([])
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 })
  const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0)
  const [rushVideoUrl, setRushVideoUrl] = useState<string | null>(null)
  const [videoLoadError, setVideoLoadError] = useState<boolean>(false)
  const [presidentialLetter, setPresidentialLetter] = useState<Copy | null>(null)
  const [presidentAsset, setPresidentAsset] = useState<Asset | null>(null)

  // Load gallery assets
  useEffect(() => {
    const allAssets = [...(assets || []), ...(globalAssets || [])]
    const galleryImages = allAssets.filter(asset => 
      asset.title.toLowerCase().includes('gallery') && asset.picture
    )
    setGalleryAssets(galleryImages)
    console.log('Found gallery assets:', galleryImages)
  }, [assets, globalAssets])

  // Load rush video from Sanity
  useEffect(() => {
    console.log('Local video path imported:', rushVideoLocal)
    
    const loadRushVideo = async () => {
      try {
        console.log('Looking for rush-video asset in Sanity...')
        
        // First, let's see all available assets to debug
        const allAssets = [...(assets || []), ...(globalAssets || [])]
        console.log('All available assets:', allAssets)
        console.log('Asset titles:', allAssets.map(asset => asset.title))
        
        // Try to find rush-video asset in the passed assets first
        let rushVideoAsset = allAssets.find(asset => 
          asset.title.toLowerCase() === 'rush-video'
        )
        
        // If not found, try variations
        if (!rushVideoAsset) {
          rushVideoAsset = allAssets.find(asset => 
            asset.title.toLowerCase().includes('rush') && 
            asset.title.toLowerCase().includes('video')
          )
        }
        
        if (!rushVideoAsset) {
          // If not found in passed assets, try fetching directly from Sanity
          console.log('rush-video not found in passed assets, fetching from Sanity...')
          
          // First, let's see all assets in Sanity for debugging
          try {
            const allSanityAssets = await listAllAssets()
            console.log('All Sanity assets:', allSanityAssets.map(a => ({ title: a.title, type: a.asset_type })))
          } catch (error) {
            console.error('Error listing all assets:', error)
          }
          
          const fetchedAsset = await getAssetByTitle('rush-video')
          rushVideoAsset = fetchedAsset || undefined
        }
        
        console.log('Found rush-video asset:', rushVideoAsset)
        
        if (rushVideoAsset) {
          const videoUrl = getFileUrl(rushVideoAsset)
          console.log('Generated video URL:', videoUrl)
          if (videoUrl) {
            console.log('Found rush-video asset, using Sanity URL:', videoUrl)
            setRushVideoUrl(videoUrl)
          } else {
            console.log('rush-video asset found but no valid file URL, using local fallback')
            console.log('Asset structure:', JSON.stringify(rushVideoAsset, null, 2))
            setRushVideoUrl(null)
          }
        } else {
          console.log('No rush-video asset found in Sanity, using local fallback')
          setRushVideoUrl(null)
        }
      } catch (error) {
        console.error('Error loading rush video from Sanity:', error)
        setRushVideoUrl(null)
      }
    }

    loadRushVideo()
  }, [assets, globalAssets])

  // Load presidential content from Sanity
  useEffect(() => {
    const loadPresidentialContent = async () => {
      try {
        console.log('Loading presidential content...')
        
        // Fetch presidential letter content
        const letterContent = await getCopyByTitle('Presidential Letter')
        console.log('Presidential letter content:', letterContent)
        setPresidentialLetter(letterContent)
        
        // Try to find president asset in the passed assets first
        const allAssets = [...(assets || []), ...(globalAssets || [])]
        console.log('🔍 Searching for president asset in:', allAssets.map(a => ({ title: a.title, id: a._id, picture: a.picture })))
        
        let presidentAssetFound: Asset | null = allAssets.find(asset => 
          asset.title.toLowerCase() === 'president'
        ) || null
        
        // If not found in passed assets, try fetching directly from Sanity
        if (!presidentAssetFound) {
          console.log('President asset not found in passed assets, fetching from Sanity...')
          presidentAssetFound = await getAssetByTitle('president')
          
          if (presidentAssetFound) {
            console.log('🎯 Fetched president asset from Sanity:', {
              id: presidentAssetFound._id,
              title: presidentAssetFound.title,
              picture: presidentAssetFound.picture
            })
            
            // Log the picture reference for debugging
            if (presidentAssetFound.picture?.asset?._ref) {
              const ref = presidentAssetFound.picture.asset._ref
              console.log('📷 Picture reference:', ref)
            }
          }
        }
        
        console.log('President asset final:', presidentAssetFound)
        setPresidentAsset(presidentAssetFound)
        
      } catch (error) {
        console.error('Error loading presidential content:', error)
      }
    }

    loadPresidentialContent()
  }, [assets, globalAssets])

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

  // Intersection observer for video section toast
  useEffect(() => {
    if (!videoSectionRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5 && !hasShownToast) {
            // Show toast when video section is more than 50% visible
            toast("Interested in rushing? Click here to learn more!", {
              duration: 5000,
              action: {
                label: "Learn More",
                onClick: () => navigate({ to: '/rush' })
              },
              onDismiss: () => setHasShownToast(true),
              onAutoClose: () => setHasShownToast(true)
            })
            setHasShownToast(true)
          } else if (!entry.isIntersecting) {
            // Dismiss any active toasts when leaving the video section
            toast.dismiss()
          }
        })
      },
      {
        threshold: [0.5], // Trigger when 50% of the video section is visible
        rootMargin: '0px'
      }
    )

    observer.observe(videoSectionRef.current)

    return () => {
      observer.disconnect()
    }
  }, [navigate, hasShownToast])

  // Mouse tracking effect for gallery painting in About Us section
  useEffect(() => {
    if (!aboutUsSectionRef.current || galleryAssets.length === 0) return

    let animationFrameId: number
    let lastPaintTime = 0
    const paintCooldown = 500 // Minimum 500ms between paints for longer delay

    const handleMouseMove = (event: MouseEvent) => {
      const now = Date.now()
      if (now - lastPaintTime < paintCooldown) return

      event.preventDefault()
      event.stopPropagation()

      cancelAnimationFrame(animationFrameId)
      animationFrameId = requestAnimationFrame(() => {
        const rect = aboutUsSectionRef.current!.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top
        
        // Calculate distance moved since last position
        const distance = Math.sqrt(
          Math.pow(mouseX - lastMousePosition.x, 2) + 
          Math.pow(mouseY - lastMousePosition.y, 2)
        )
        
        // Only paint if moved more than 100 pixels
        if (distance >= 200) {
          const currentAsset = galleryAssets[currentGalleryIndex]
          if (currentAsset?.picture) {
            const newPaintedImage: PaintedImage = {
              id: `painted-${Date.now()}-${Math.random()}`,
              x: mouseX,
              y: mouseY,
              imageUrl: urlFor(currentAsset.picture).width(200).height(200).url(),
              timestamp: Date.now()
            }
            
            setPaintedImages(prev => {
              // Limit to maximum 10 painted images for performance
              const newImages = [...prev, newPaintedImage]
              return newImages.length > 10 ? newImages.slice(-10) : newImages
            })
            setLastMousePosition({ x: mouseX, y: mouseY })
            setCurrentGalleryIndex(prev => (prev + 1) % galleryAssets.length)
            lastPaintTime = now
            
            // Remove the painted image after 200ms delay + 1000ms fade duration
            setTimeout(() => {
              setPaintedImages(prev => prev.filter(img => img.id !== newPaintedImage.id))
            }, 1200)
          }
        }
      })
    }

    const aboutUsElement = aboutUsSectionRef.current
    aboutUsElement.addEventListener('mousemove', handleMouseMove, { passive: true })
    
    return () => {
      aboutUsElement.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [galleryAssets, lastMousePosition, currentGalleryIndex])

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
            className="absolute bg-white hidden md:block w-0 md:w-[70%]"
            style={{
              left: '10%',
              top: vectorPosition.y + 15,
              height: '1px',
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
      <div ref={videoSectionRef} className="h-screen snap-start">
        <video 
          className="w-full h-full object-cover"
          autoPlay 
          muted
          loop 
          playsInline
          controls={false}
          key={rushVideoUrl || 'local'} // Force re-render when video source changes
          onError={(e) => {
            console.error('Video load error:', e)
            console.error('Failed video source:', rushVideoUrl || rushVideoLocal)
            console.error('Video element:', e.target)
            setVideoLoadError(true)
            // If Sanity video fails, try to fallback to local video
            if (rushVideoUrl) {
              console.log('Sanity video failed, falling back to local video')
              setRushVideoUrl(null)
            } else {
              console.error('Local video also failed to load. Video format may not be supported.')
              console.error('Local video path:', rushVideoLocal)
              // You may need to convert rushvideof25.MOV to MP4 format for better browser support
            }
          }}
          onLoadStart={() => {
            console.log('Video load started:', rushVideoUrl ? 'Sanity video' : 'Local video')
            setVideoLoadError(false) // Reset error state when starting to load
          }}
          onCanPlay={() => {
            console.log('Video can play:', rushVideoUrl ? 'Sanity video' : 'Local video')
            setVideoLoadError(false)
          }}
        >
          {rushVideoUrl ? (
            <source src={rushVideoUrl} type={getVideoMimeType(rushVideoUrl)} />
          ) : (
            <>
              {/* Try the imported local video */}
              <source src={rushVideoLocal} type="video/quicktime" />
              {/* Additional fallback message */}
            </>
          )}
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Presidential Welcome Section */}
      <div className="bg-black py-16 sm:py-32 px-8 snap-start min-h-screen relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Content Container */}
          <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-16">
            {/* President Image */}
            <div className="flex-shrink-0 w-full lg:w-96">
              {presidentAsset?.picture ? (
                (() => {
                  try {
                    // Get the image URL from file asset
                    const imageUrl = getImageUrlFromFileAsset(presidentAsset, 400, 500)
                    
                    if (!imageUrl) {
                      throw new Error('Could not generate image URL from file asset')
                    }
                    
                    return (
                      <div className="w-full">
                        <img
                          src={imageUrl}
                          alt="President"
                            className="w-full h-auto object-cover rounded"
                        />
                        {/* President Name Below Image */}
                        <div className="mt-4 text-right">
                          <p className="font-['PP_Editorial_New'] text-white text-lg">Rebecca Silva</p>
                          <p className="font-['Avenir:Roman'] text-yellow-500 text-sm mt-1">President</p>
                        </div>
                      </div>
                    )
                  } catch (error) {
                    console.error('Error rendering president image:', error)
                    return (
                      <div className="w-full">
                          <div className="w-full h-96 bg-gray-800 rounded flex items-center justify-center border-2 border-red-500">
                          <div className="text-center text-red-400 font-['Avenir:Roman'] p-4">
                            <p className="mb-2">⚠️ Image Error</p>
                            <p className="text-sm">Please re-upload the president image in Sanity Studio</p>
                          </div>
                        </div>
                        {/* Name below even on error */}
                        <div className="mt-4 text-right">
                          <p className="font-['PP_Editorial_New'] text-white text-lg">Rebecca Silva</p>
                          <p className="font-['Avenir:Roman'] text-yellow-500 text-sm mt-1">President</p>
                        </div>
                      </div>
                    )
                  }
                })()
              ) : (
                <div className="w-full">
                    <div className="w-full h-96 bg-gray-800 rounded flex items-center justify-center">
                    <p className="text-gray-400 font-['Avenir:Roman']">President image loading...</p>
                  </div>
                  {/* Placeholder name */}
                  <div className="mt-4 text-right">
                    <p className="font-['PP_Editorial_New'] text-white text-lg">Rebecca Silva</p>
                    <p className="font-['Avenir:Roman'] text-yellow-500 text-sm mt-1">President</p>
                  </div>
                </div>
              )}
            </div>

            {/* Letter Content Card */}
            <div className="flex-1">
              {/* Section Title - Left aligned with text card */}
              <h2 className="font-['PP_Editorial_New'] text-white text-2xl sm:text-3xl lg:text-4xl tracking-wide mb-8 text-left">
                Presidential Welcome
              </h2>
              
              {presidentialLetter ? (
                <div className="text-white">
                  <div
                    className="font-['Avenir:Roman'] text-base leading-relaxed whitespace-pre-line"
                    style={{ lineHeight: '1.6' }}
                  >
                    {presidentialLetter.content}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 font-['Avenir:Roman']">
                  <p>Loading presidential letter...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* About Us Section - Blue Background */}
      <div ref={aboutUsSectionRef} className="about-us-section bg-[#000000] py-16 sm:py-32 px-8 snap-start min-h-screen relative overflow-hidden">
        {/* Parallax Background */}
        <div className="parallax-background absolute inset-0 bg-[#000000] transform translate-y-0 transition-transform duration-1000 ease-out">
        </div>
        
        {/* Painted Gallery Images Container */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {paintedImages.map((paintedImage) => (
            <div
              key={paintedImage.id}
              className="absolute pointer-events-none"
              style={{
                left: paintedImage.x,
                top: paintedImage.y,
                transform: 'translate(-50%, -50%)', // Center the image at mouse position
                animation: 'fadeOutScaleDelayed 2000ms ease-out forwards',
                willChange: 'transform, opacity' // Optimize for animations
              }}
            >
              <img
                src={paintedImage.imageUrl}
                alt="Gallery painting"
                className="w-[200px] h-[200px] object-cover rounded-lg opacity-100"
              />
            </div>
          ))}
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <p className="text-[#c4c4c4] text-sm font-['Avenir:Roman'] font-normal mb-16">(About Us)</p>
            
            <div className="mb-16">
              <p className="text-white text-4xl sm:text-3xl md:text-4xl lg:text-5xl font-['PP_Editorial_New'] leading-[1.1] max-w-4xl mx-auto" style={{ letterSpacing: '-0.96px' }}>
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

            <p className="text-white text-4xl sm:text-3xl md:text-4xl lg:text-5xl font-['PP_Editorial_New'] leading-[1.1] max-w-4xl mx-auto" style={{ letterSpacing: '-0.96px' }}>
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
