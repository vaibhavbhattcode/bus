import { Link } from 'react-router-dom';
import { Bus, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-gradient-to-tr from-primary-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-all duration-300">
                <Bus className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">BusBook</span>
            </Link>
            <p className="text-gray-500 leading-relaxed">
              Experience the future of travel with our premium bus booking platform. Comfort, reliability, and style in every journey.
            </p>
            <div className="flex space-x-4">
              <SocialLink href="#" icon={Facebook} />
              <SocialLink href="#" icon={Twitter} />
              <SocialLink href="#" icon={Instagram} />
              <SocialLink href="#" icon={Linkedin} />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-gray-900 font-bold mb-6">Quick Links</h3>
            <ul className="space-y-4">
              <FooterLink to="/search" label="Search Routes" />
              <FooterLink to="/about" label="About Us" />
              <FooterLink to="/careers" label="Careers" />
              <FooterLink to="/blog" label="Travel Blog" />
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-gray-900 font-bold mb-6">Support</h3>
            <ul className="space-y-4">
              <FooterLink to="/contact" label="Help Center" />
              <FooterLink to="/terms" label="Terms of Service" />
              <FooterLink to="/privacy" label="Privacy Policy" />
              <FooterLink to="/contact" label="Contact Us" />
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-gray-900 font-bold mb-6">Get in Touch</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3 text-gray-500">
                <MapPin className="h-5 w-5 text-primary-500 shrink-0 mt-0.5" />
                <span>123 Business Ave, Tech Park,<br />Bangalore, KA 560103</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-500">
                <Phone className="h-5 w-5 text-primary-500 shrink-0" />
                <span>+91 8000 555 123</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-500">
                <Mail className="h-5 w-5 text-primary-500 shrink-0" />
                <span>support@busbook.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter Subscription */}
        <div className="border-t border-gray-100 pt-12 pb-8">
          <div className="bg-primary-50 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="md:w-1/2">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Subscribe to our newsletter</h3>
              <p className="text-gray-600">Get the latest updates, exclusive offers, and travel tips directly to your inbox.</p>
            </div>
            <div className="w-full md:w-1/2 max-w-md">
              <form className="flex gap-3" onSubmit={(e) => e.preventDefault()}>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="flex-1 px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                />
                <button type="submit" className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg shadow-gray-900/20">
                  Subscribe
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} BusBook. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm text-gray-500">
            <Link to="/privacy" className="hover:text-primary-600 transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-primary-600 transition-colors">Terms</Link>
            <Link to="/sitemap" className="hover:text-primary-600 transition-colors">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, icon: Icon }: { href: string; icon: any }) {
  return (
    <a 
      href={href} 
      className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-all duration-300 hover:scale-110"
    >
      <Icon className="h-5 w-5" />
    </a>
  );
}

function FooterLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link to={to} className="text-gray-500 hover:text-primary-600 transition-colors inline-flex items-center group">
        <span className="w-0 group-hover:w-2 h-0.5 bg-primary-600 mr-0 group-hover:mr-2 transition-all duration-300"></span>
        {label}
      </Link>
    </li>
  );
}
