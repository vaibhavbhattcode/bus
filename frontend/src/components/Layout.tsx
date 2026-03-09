import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bus, Home, Search, BookOpen, User, LogOut, Menu, X,
  TrendingUp, Users, Settings, MessageSquare, ChevronDown,
  Info, Briefcase, FileText, Phone, Shield, FileCheck,
  Tag, Bell, BarChart2, FileSearch, Server, Ticket, Zap,
  Wallet, Star, DollarSign
} from 'lucide-react';
import NotificationsBell from './NotificationsBell';
import Footer from './Footer';
import SupportWidget from './SupportWidget';
import LanguageCurrencySelector from './LanguageCurrencySelector';

type OpenDropdown = 'user' | 'company' | `nav-${string}` | null;

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCompanyOpen, setMobileCompanyOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Single state controls which desktop dropdown is open – only one at a time
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);

  const navRef = useRef<HTMLElement>(null);

  // ── Single click-outside handler for ALL dropdowns ─────────────
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (navRef.current && !navRef.current.contains(e.target as Node)) {
      setOpenDropdown(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Close everything on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileMenuOpen(false);
    setMobileCompanyOpen(false);
  }, [location.pathname]);

  // Scroll detection
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggle = (key: OpenDropdown) =>
    setOpenDropdown(prev => (prev === key ? null : key));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const companyLinks = [
    { path: '/about', label: 'About Us', icon: Info, desc: 'Our story & mission' },
    { path: '/careers', label: 'Careers', icon: Briefcase, desc: 'Join the team' },
    { path: '/blog', label: 'Blog', icon: FileText, desc: 'Tips & travel guides' },
    { path: '/contact', label: 'Contact', icon: Phone, desc: 'Get in touch' },
  ];

  const mainNavLinks: any[] = isAuthenticated() && user
    ? user.role === 'PASSENGER'
      ? [
        { path: '/', label: 'Home', icon: Home },
        { path: '/search', label: 'Search Routes', icon: Search },
        { path: '/my-bookings', label: 'My Bookings', icon: Ticket },
        {
          path: '/passenger-more', label: 'More', icon: Users,
          children: [
            { path: '/wallet', label: 'My Wallet', icon: Wallet, desc: 'Balance & transactions' },
            { path: '/support', label: 'Support', icon: Shield, desc: 'Get help' },
            { path: '/price-alerts', label: 'Price Alerts', icon: Bell, desc: 'Get notified on drops' },
            { path: '/my-feedback', label: 'My Feedback', icon: Star, desc: 'Your reviews' },
          ],
        },
      ]
      : user.role === 'PROVIDER'
        ? [
          { path: '/provider/dashboard', label: 'Dashboard', icon: Home },
          { path: '/provider/routes', label: 'Routes', icon: Search },
          { path: '/provider/vehicles', label: 'Vehicles', icon: Bus },
          { path: '/provider/bookings', label: 'Bookings', icon: BookOpen },
          { path: '/provider/reviews', label: 'Reviews', icon: MessageSquare },
          { path: '/provider/earnings', label: 'Earnings', icon: DollarSign },
        ]
        : [
          { path: '/admin/dashboard', label: 'Dashboard', icon: Home },
          { path: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
          {
            path: '/admin/management', label: 'Management', icon: Users,
            children: [
              { path: '/admin/providers', label: 'Providers', icon: Bus },
              { path: '/admin/bookings', label: 'Bookings', icon: BookOpen },
              { path: '/admin/users', label: 'Users', icon: Users },
            ],
          },
          {
            path: '/admin/system', label: 'System', icon: Settings,
            children: [
              { path: '/admin/blog', label: 'Blog', icon: FileText },
              { path: '/admin/promo-codes', label: 'Promo Codes', icon: Tag },
              { path: '/admin/feedback', label: 'Feedback', icon: TrendingUp },
              { path: '/admin/support', label: 'Support', icon: Shield },
              { path: '/admin/notifications', label: 'Notifications', icon: Bell },
              { path: '/admin/destinations', label: 'Destinations', icon: FileCheck },
              { path: '/admin/settings', label: 'Settings', icon: Settings },
              { path: '/admin/audit-logs', label: 'Audit Logs', icon: FileSearch },
              { path: '/admin/access-logs', label: 'Access Logs', icon: Server },
            ],
          },
        ]
    : [
      { path: '/', label: 'Home', icon: Home },
      { path: '/search', label: 'Search Routes', icon: Search },
    ];

  const roleGradient: Record<string, string> = {
    ADMIN: 'from-rose-500 to-orange-500',
    PROVIDER: 'from-violet-500 to-indigo-600',
    PASSENGER: 'from-primary-500 to-cyan-500',
  };
  const roleBadge: Record<string, string> = {
    ADMIN: 'bg-rose-100 text-rose-700',
    PROVIDER: 'bg-violet-100 text-violet-700',
    PASSENGER: 'bg-primary-100 text-primary-700',
  };

  // ── Dropdown panel wrapper ──────────────────────────────────────
  const DropdownPanel = ({ id, align = 'left', children }: { id: OpenDropdown; align?: 'left' | 'right'; children: React.ReactNode }) => (
    <div
      className={`absolute top-full pt-2 ${align === 'right' ? 'right-0' : 'left-0'}
        transition-all duration-150 origin-top
        ${openDropdown === id ? 'opacity-100 scale-y-100 pointer-events-auto translate-y-0' : 'opacity-0 scale-y-95 pointer-events-none -translate-y-1'}`}
      style={{ zIndex: 9999 }}
    >
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-primary-100 selection:text-primary-900">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header
        ref={navRef}
        className={`fixed w-full top-0 z-[1000] transition-all duration-300 ${scrolled
          ? 'bg-white/90 backdrop-blur-2xl shadow-[0_2px_20px_rgba(0,0,0,0.08)] border-b border-gray-100/80'
          : 'bg-white/70 backdrop-blur-sm border-b border-transparent'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-6">

            {/* ── Logo ── */}
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary-500 to-indigo-600 rounded-xl blur opacity-40 group-hover:opacity-60 transition-opacity duration-300" />
                <div className="relative bg-gradient-to-tr from-primary-600 to-indigo-600 p-2 rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300">
                  <Bus className="h-5 w-5 text-white" />
                </div>
              </div>
              <span className="text-xl font-black tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent group-hover:from-primary-600 group-hover:to-indigo-600 transition-all duration-300">
                BusBook
              </span>
            </Link>

            {/* ── Desktop Nav ── */}
            <nav className="hidden md:flex items-center gap-0.5 flex-1">
              {mainNavLinks.map((link: any) => {
                const Icon = link.icon;

                if (link.children) {
                  const dropId: OpenDropdown = `nav-${link.path}`;
                  const isOpen = openDropdown === dropId;
                  const isChildActive = link.children.some((c: any) => location.pathname === c.path);
                  return (
                    <div key={link.path} className="relative">
                      <button
                        onClick={() => toggle(dropId)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isChildActive || isOpen ? 'text-primary-700 bg-primary-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{link.label}</span>
                        <ChevronDown className={`h-3 w-3 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <DropdownPanel id={dropId}>
                        <div className="w-52 bg-white rounded-2xl shadow-xl shadow-gray-200/80 border border-gray-100 p-1.5 ring-1 ring-black/5">
                          {link.children.map((child: any) => {
                            const ChildIcon = child.icon;
                            const isActive = location.pathname === child.path;
                            return (
                              <Link key={child.path} to={child.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                                <ChildIcon className="h-4 w-4 shrink-0" />
                                <span>{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </DropdownPanel>
                    </div>
                  );
                }

                const isActive = location.pathname === link.path;
                return (
                  <Link key={link.path} to={link.path}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${isActive ? 'text-primary-700 bg-primary-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'}`}>
                    <Icon className={`h-3.5 w-3.5 transition-colors ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span>{link.label}</span>
                    {isActive && <span className="absolute -bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-primary-500 to-indigo-500" />}
                  </Link>
                );
              })}

              {/* Company dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggle('company')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${openDropdown === 'company' ? 'text-primary-700 bg-primary-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/60'}`}
                >
                  <span>Company</span>
                  <ChevronDown className={`h-3 w-3 opacity-50 transition-transform duration-200 ${openDropdown === 'company' ? 'rotate-180' : ''}`} />
                </button>
                <DropdownPanel id="company" align="right">
                  <div className="w-60 bg-white rounded-2xl shadow-xl shadow-gray-200/80 border border-gray-100 p-1.5 ring-1 ring-black/5">
                    {companyLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link key={link.path} to={link.path}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors group/item">
                          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-gray-100 group-hover/item:bg-primary-50 transition-colors shrink-0">
                            <Icon className="h-4 w-4 text-gray-500 group-hover/item:text-primary-600 transition-colors" />
                          </div>
                          <div>
                            <p className="font-medium leading-none mb-0.5">{link.label}</p>
                            <p className="text-xs text-gray-400">{link.desc}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </DropdownPanel>
              </div>
            </nav>

            {/* ── Right side: Language + Auth ── */}
            <div className="hidden md:flex items-center gap-3 ml-auto">
              <div className="hidden lg:block">
                <LanguageCurrencySelector />
              </div>

              {isAuthenticated() && user ? (
                <>
                  <NotificationsBell />

                  {/* Avatar menu */}
                  <div className="relative">
                    <button
                      onClick={() => toggle('user')}
                      className={`flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border-2 transition-all duration-200 ${openDropdown === 'user'
                        ? 'border-primary-300 bg-primary-50/50 shadow-md shadow-primary-100'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <div className={`relative h-8 w-8 rounded-full bg-gradient-to-tr ${roleGradient[user.role] || roleGradient.PASSENGER} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                        {user.name.charAt(0).toUpperCase()}
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
                      </div>
                      <div className="hidden lg:block text-left">
                        <p className="text-sm font-semibold text-gray-900 leading-none">{user.name.split(' ')[0]}</p>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${roleBadge[user.role] || roleBadge.PASSENGER}`}>
                          {user.role}
                        </span>
                      </div>
                      <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${openDropdown === 'user' ? 'rotate-180' : ''}`} />
                    </button>

                    <DropdownPanel id="user" align="right">
                      <div className="w-64 bg-white rounded-2xl shadow-2xl shadow-gray-200/80 border border-gray-100/80 ring-1 ring-black/5 overflow-hidden">
                        {/* Gradient header */}
                        <div className={`bg-gradient-to-br ${roleGradient[user.role] || roleGradient.PASSENGER} p-4`}>
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-white/25 flex items-center justify-center text-white font-black text-lg backdrop-blur-sm">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white leading-tight truncate">{user.name}</p>
                              <p className="text-xs text-white/75 truncate">{user.email || user.phone}</p>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-white/90 bg-white/20 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                                {user.role}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-1.5">
                          <Link to="/profile" onClick={() => setOpenDropdown(null)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              <User className="h-4 w-4" />
                            </div>
                            <span className="font-medium">My Profile</span>
                          </Link>
                          {user?.role === 'PASSENGER' && (
                            <>
                              <Link to="/wallet" onClick={() => setOpenDropdown(null)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <Wallet className="h-4 w-4" />
                                </div>
                                <span className="font-medium">My Wallet</span>
                              </Link>
                              <Link to="/support" onClick={() => setOpenDropdown(null)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <Shield className="h-4 w-4" />
                                </div>
                                <span className="font-medium">Support</span>
                              </Link>
                            </>
                          )}
                          <Link to="/settings/notifications" onClick={() => setOpenDropdown(null)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                              <Settings className="h-4 w-4" />
                            </div>
                            <span className="font-medium">Settings</span>
                          </Link>

                          <div className="my-1.5 h-px bg-gray-100" />

                          <button onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                              <LogOut className="h-4 w-4" />
                            </div>
                            <span className="font-medium">Sign out</span>
                          </button>
                        </div>
                      </div>
                    </DropdownPanel>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login"
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100/60 rounded-lg transition-all duration-200">
                    Log in
                  </Link>
                  <Link to="/register"
                    className="relative px-4 py-2 text-sm font-semibold text-white rounded-xl overflow-hidden group shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-300 hover:-translate-y-0.5">
                    <span className="absolute inset-0 bg-gradient-to-r from-primary-600 to-indigo-600 group-hover:from-primary-500 group-hover:to-indigo-500 transition-all duration-300" />
                    <span className="relative flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      Sign up free
                    </span>
                  </Link>
                </div>
              )}
            </div>

            {/* ── Mobile toggle ── */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden ml-auto flex items-center justify-center h-9 w-9 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* ── Mobile drawer ─────────────────────────────────────── */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="border-t border-gray-100 bg-white h-[calc(100vh-64px)] overflow-y-auto">
            <div className="p-4 space-y-1">

              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2 mt-1">Navigate</p>

              {mainNavLinks.map((link: any) => {
                const Icon = link.icon;
                if (link.children) {
                  return (
                    <div key={link.path} className="space-y-0.5">
                      <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{link.label}</span>
                      </div>
                      <div className="ml-2 space-y-0.5 border-l-2 border-gray-100 pl-3">
                        {link.children.map((child: any) => {
                          const ChildIcon = child.icon;
                          const isActive = location.pathname === child.path;
                          return (
                            <Link key={child.path} to={child.path} onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${isActive ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                              <ChildIcon className="h-4 w-4 shrink-0" />
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                const isActive = location.pathname === link.path;
                return (
                  <Link key={link.path} to={link.path} onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{link.label}</span>
                    {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-primary-500" />}
                  </Link>
                );
              })}

              {/* Mobile company accordion */}
              <div className="pt-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2 mt-2">Company</p>
                <button onClick={() => setMobileCompanyOpen(p => !p)}
                  className="flex items-center justify-between w-full px-3 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <span>Company links</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${mobileCompanyOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${mobileCompanyOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="space-y-0.5 pb-1">
                    {companyLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link key={link.path} to={link.path} onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 ml-2 transition-colors">
                          <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                          <span>{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mobile auth */}
              <div className="pt-3 mt-3 border-t border-gray-100">
                {isAuthenticated() && user ? (
                  <div>
                    <div className={`bg-gradient-to-br ${roleGradient[user.role] || roleGradient.PASSENGER} rounded-2xl p-4 mb-3 flex items-center gap-3`}>
                      <div className="h-12 w-12 rounded-xl bg-white/25 flex items-center justify-center text-white font-black text-xl">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{user.name}</p>
                        <p className="text-xs text-white/75 truncate">{user.email || user.phone}</p>
                      </div>
                    </div>
                    <Link to="/profile" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                      <User className="h-5 w-5" /><span>My Profile</span>
                    </Link>
                    {user?.role === 'PASSENGER' && (
                      <>
                        <Link to="/wallet" onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                          <Wallet className="h-5 w-5" /><span>My Wallet</span>
                        </Link>
                        <Link to="/support" onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                          <Shield className="h-5 w-5" /><span>Support</span>
                        </Link>
                      </>
                    )}
                    <Link to="/settings/notifications" onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                      <Settings className="h-5 w-5" /><span>Settings</span>
                    </Link>
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-red-600 hover:bg-red-50 text-left">
                      <LogOut className="h-5 w-5" /><span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 px-1">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                      className="block w-full py-3 text-center text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                      Log in
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}
                      className="relative block w-full py-3 text-center text-sm font-bold text-white rounded-xl overflow-hidden shadow-lg shadow-primary-500/30">
                      <span className="absolute inset-0 bg-gradient-to-r from-primary-600 to-indigo-600" />
                      <span className="relative flex items-center justify-center gap-2">
                        <Zap className="h-4 w-4" />
                        Create free account
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────── */}
      <main className="flex-grow pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="animate-fadeIn">
          <Outlet />
        </div>
      </main>

      <Footer />
      <SupportWidget />
    </div>
  );
}
