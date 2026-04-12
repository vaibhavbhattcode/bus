import { Link } from 'react-router-dom';
import { Bus, Mail, Phone, MapPin, ArrowRight, Twitter, Linkedin, Instagram, Facebook, Youtube, ExternalLink } from 'lucide-react';

const footerLinks = {
  product: [
    { label: 'Search Routes', path: '/search' },
    { label: 'My Bookings', path: '/my-bookings' },
    { label: 'Price Alerts', path: '/price-alerts' },
    { label: 'My Wallet', path: '/wallet' },
    { label: 'Track Bus', path: '/search' },
  ],
  company: [
    { label: 'About Us', path: '/about' },
    { label: 'Careers', path: '/careers' },
    { label: 'Blog', path: '/blog' },
    { label: 'Press Kit', path: '/about' },
    { label: 'Partners', path: '/about' },
  ],
  support: [
    { label: 'Help Center', path: '/support' },
    { label: 'Contact Us', path: '/contact' },
    { label: 'Safety', path: '/about' },
    { label: 'Privacy Policy', path: '/privacy' },
    { label: 'Terms of Service', path: '/terms' },
  ],
};

const socialLinks = [
  { label: 'Twitter', icon: Twitter, href: '#', color: 'hover:text-sky-400' },
  { label: 'Instagram', icon: Instagram, href: '#', color: 'hover:text-pink-400' },
  { label: 'LinkedIn', icon: Linkedin, href: '#', color: 'hover:text-blue-400' },
  { label: 'Facebook', icon: Facebook, href: '#', color: 'hover:text-blue-500' },
  { label: 'YouTube', icon: Youtube, href: '#', color: 'hover:text-red-400' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-300 relative overflow-hidden">
      {/* Top glowing orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Newsletter Banner */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-gradient-to-r from-primary-600/20 via-indigo-600/20 to-purple-600/20 rounded-3xl p-8 md:p-10 border border-white/10 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-10 rounded-3xl" />
            <div className="relative flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                  Get exclusive travel deals
                </h3>
                <p className="text-gray-400 text-sm">
                  Subscribe to our newsletter and save up to 30% on your next journey. No spam, ever.
                </p>
              </div>
              <div className="flex w-full md:w-auto gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 md:w-64 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500/60 focus:bg-white/15 transition-all text-sm"
                />
                <button className="flex items-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-primary-900/30 whitespace-nowrap">
                  Subscribe <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">

          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Logo */}
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary-500 to-indigo-600 rounded-xl blur opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="relative bg-gradient-to-tr from-primary-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                  <Bus className="h-5 w-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-black text-white">BusBook</span>
            </Link>

            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              India's most trusted platform for premium bus travel. Safe, reliable, and always on time — we redefine how India travels.
            </p>

            {/* Contact */}
            <div className="space-y-3">
              <a href="mailto:support@busbook.in" className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-primary-600/20 flex items-center justify-center transition-colors">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                support@busbook.in
              </a>
              <a href="tel:+911800000000" className="flex items-center gap-3 text-sm text-gray-400 hover:text-white transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-primary-600/20 flex items-center justify-center transition-colors">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                1800-000-0000 (Toll Free)
              </a>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                Koramangala, Bangalore, India
              </div>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-3">
              {socialLinks.map(({ label, icon: Icon, href, color }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className={`w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 ${color} transition-all hover:-translate-y-0.5`}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-5">
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </h4>
              <ul className="space-y-3">
                {links.map(({ label, path }) => (
                  <li key={label}>
                    <Link
                      to={path}
                      className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 group"
                    >
                      <span className="group-hover:translate-x-0.5 transition-transform">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* App Store Badges */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2.5 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm">
                <span className="text-2xl">▶</span>
                <div className="text-left">
                  <p className="text-[10px] text-gray-500 leading-none">GET IT ON</p>
                  <p className="text-white font-semibold text-xs leading-none mt-0.5">Google Play</p>
                </div>
              </button>
              <button className="flex items-center gap-2.5 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-sm">
                <span className="text-2xl">🍎</span>
                <div className="text-left">
                  <p className="text-[10px] text-gray-500 leading-none">DOWNLOAD ON THE</p>
                  <p className="text-white font-semibold text-xs leading-none mt-0.5">App Store</p>
                </div>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
              <a href="https://www.cert-in.org.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-gray-400 transition-colors">
                CERT-In Compliant <ExternalLink className="w-3 h-3" />
              </a>
              <span>•</span>
              <span>256-bit SSL Encryption</span>
              <span>•</span>
              <span>PCI DSS Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} BusBook Technologies Pvt. Ltd. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-gray-400 transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-gray-400 transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-gray-400 transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
