import { Link } from '@tanstack/react-router'

interface NavigationProps {
  currentPage?: string
  mode?: 'dark' | 'light'
}

export default function Navigation({ currentPage, mode = 'dark' }: NavigationProps) {
  const navItems = [
    { name: 'About', path: '/' },
    { name: 'Alumni', path: '/alumni' },
    { name: 'Members', path: '/brothers' },
    { name: 'Rush', path: '/rush' },
    { name: 'Chi Sigma Consulting', path: '/consulting' }
  ]

  return (
    <>
      {/* Side Navigation */}
      <div className="fixed left-4 sm:left-8 top-4 sm:top-8 w-32 sm:w-40 flex flex-col gap-1 z-50">
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
    </>
  )
}
