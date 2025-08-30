import { Link } from '@tanstack/react-router'
import { Separator } from './ui/separator'
import { Button } from './ui/button'
import { 
  Mail, 
  Instagram, 
  Linkedin, 
  ExternalLink,
  Heart
} from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-[#03345f] border-t border-border/40">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              Alpha Kappa Psi
            </h3>
            <p className="text-sm text-white leading-relaxed">
              Professional business fraternity dedicated to developing principled business leaders.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a 
                  href="mailto:contact@akpsi.org" 
                  aria-label="Email us"
                  className="hover:text-white transition-colors"
                >
                  <Mail className="h-4 w-4 text-white" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a 
                  href="https://instagram.com/akpsi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Follow us on Instagram"
                  className="hover:text-white transition-colors"
                >
                  <Instagram className="h-4 w-4 text-white" />
                </a>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <a 
                  href="https://linkedin.com/company/akpsi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Connect with us on LinkedIn"
                  className="hover:text-white transition-colors"
                >
                  <Linkedin className="h-4 w-4 text-white" />
                </a>
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-white">
              Quick Links
            </h4>
            <nav className="space-y-2">
              <Link 
                to="/" 
                className="block text-sm text-white hover:text-foreground transition-colors"
              >
                Home
              </Link>
              <Link 
                to="/brothers" 
                className="block text-sm text-white hover:text-foreground transition-colors"
              >
                Brothers
              </Link>
              <Link 
                to="/rush" 
                className="block text-sm text-white hover:text-foreground transition-colors"
              >
                Rush
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-white">
              Resources
            </h4>
            <nav className="space-y-2">
              <a 
                href="https://akpsi.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-white hover:text-foreground transition-colors"
              >
                National Website
                <ExternalLink className="h-3 w-3" />
              </a>
              <a 
                href="#" 
                className="block text-sm text-white hover:text-foreground transition-colors"
              >
                Chapter History
              </a>
              <a 
                href="#" 
                className="block text-sm text-white hover:text-foreground transition-colors"
              >
                Alumni Network
              </a>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-white">
              Get In Touch
            </h4>
            <div className="space-y-2 text-sm text-white">
              <p className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                akpsineu@gmail.com
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-white">
          <div className="flex items-center gap-1">
            <span>© {currentYear} Alpha Kappa Psi. Made with</span>
            <Heart className="h-3 w-3 text-white fill-current" />
          </div>
          
        </div>
      </div>
    </footer>
  )
}
