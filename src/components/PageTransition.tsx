import React, { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Fade in when component mounts
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 50) // Small delay to ensure smooth transition

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Listen for route changes to trigger fade out
    const handleRouteChange = () => {
      setIsExiting(true)
      setIsVisible(false)
    }

    // Note: This is a simplified approach. In a real implementation,
    // you might want to use router events or a more sophisticated state management
    return () => {
      // Cleanup if needed
    }
  }, [router])

  return (
    <div 
      className={`transition-all duration-500 ease-in-out ${
        isVisible && !isExiting 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4'
      } ${className}`}
    >
      {children}
    </div>
  )
}

export default PageTransition
