import { Link } from '@tanstack/react-router'
import { useState } from 'react'

interface NavigationProps {
  currentPage?: string
  mode?: 'dark' | 'light'
}

export default function Navigation({ currentPage, mode = 'dark' }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  
  const openMenu = () => {
    setIsMobileMenuOpen(true)
    // Delay animation to allow initial render with opacity-0
    setTimeout(() => {
      setIsAnimating(true)
    }, 10)
  }
  
  const closeMenu = () => {
    setIsAnimating(false)
    setTimeout(() => {
      setIsMobileMenuOpen(false)
    }, 600) // Match the animation duration
  }

  const navItems = [
    { name: 'About', path: '/' },
    { name: 'Alumni', path: '/alumni' },
    { name: 'Members', path: '/brothers' },
    { name: 'Rush', path: '/rush' },
    { name: 'Chi Sigma Consulting', path: '/consulting' }
  ]

  return (
    <>
      {/* Desktop Side Navigation */}
      <div className="hidden md:flex fixed left-4 sm:left-8 top-4 sm:top-8 w-32 sm:w-40 flex-col gap-1 z-50">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`flex items-center gap-1.5 font-['Avenir:Roman'] text-sm sm:text-base transition-all duration-300 ease-in-out cursor-pointer pointer-events-auto ${
              currentPage === item.name 
                ? 'text-[#E5C26C]' 
                : mode === 'dark' ? 'text-black hover:text-[#E5C26C]' : 'text-white hover:text-[#E5C26C]'
            }`}
          >
            {currentPage === item.name && (
              <div className="w-0.5 h-0.5 sm:w-1 sm:h-1 bg-current rounded-full shrink-0 transition-colors duration-300" />
            )}
            <span className="transition-colors duration-300">{item.name}</span>
          </Link>
        ))}
      </div>

      {/* Mobile Hamburger Button */}
      <button
        className="md:hidden fixed left-4 top-4 z-50 w-8 h-8 flex flex-col justify-center items-center gap-1.5 pointer-events-auto"
        onClick={() => isMobileMenuOpen ? closeMenu() : openMenu()}
        aria-label="Toggle menu"
      >
        <div className={`w-6 h-0.5 transition-all duration-300 ${
          mode === 'dark' ? 'bg-black' : 'bg-white'
        } ${isMobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`} />
        <div className={`w-6 h-0.5 transition-all duration-300 ${
          mode === 'dark' ? 'bg-black' : 'bg-white'
        } ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
        <div className={`w-6 h-0.5 transition-all duration-300 ${
          mode === 'dark' ? 'bg-black' : 'bg-white'
        } ${isMobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
      </button>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className={`md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center pl-8 transition-opacity duration-600 ${
            isAnimating ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMenu}
        >
          <div 
            className={`flex flex-col gap-3 text-left transition-all duration-600 ${
              isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-1 font-['Avenir:Roman'] text-2xl transition-all duration-300 ease-in-out cursor-pointer ${
                  currentPage === item.name 
                    ? 'text-[#E5C26C]' 
                    : 'text-white hover:text-[#E5C26C]'
                }`}
                onClick={closeMenu}
              >
                {currentPage === item.name && (
                  <div className="w-2 h-2 bg-current rounded-full shrink-0 transition-colors duration-300" />
                )}
                <span className="transition-colors duration-300">{item.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
