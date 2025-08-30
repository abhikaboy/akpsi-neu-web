import React, { useEffect, useRef } from 'react'

interface RushContentSectionProps {
  title: string
  content: string
  className?: string
}

const RushContentSection: React.FC<RushContentSectionProps> = ({ 
  title, 
  content, 
  className = '' 
}) => {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const handleScroll = () => {
      const rect = section.getBoundingClientRect()
      const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height)
      const translateY = Math.max(0, Math.min(20, scrollProgress * 20)) // Subtle parallax effect
      
      section.style.transform = `translateY(${translateY}px)`
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial call

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div ref={sectionRef} className={`transition-transform duration-100 ease-out ${className}`}>
      <div className="mb-[18px]">
        <h2 className="font-['PP_Editorial_New'] text-[24px] text-black tracking-[1px] leading-none">
          {title}
        </h2>
      </div>
      <div className="font-['Avenir:Roman'] text-[16px] text-black leading-[2]">
        {content.split('\n').map((paragraph, index) => (
          <p key={index} className={index < content.split('\n').length - 1 ? 'mb-0' : ''}>
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  )
}

export default RushContentSection
