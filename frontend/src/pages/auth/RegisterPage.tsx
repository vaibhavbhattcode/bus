import { Link } from 'react-router-dom';
import { User, Building2, ArrowRight, Check } from 'lucide-react';
import SEO from '../../components/SEO';
import AuthLayout from '../../components/AuthLayout';

const passengerPerks = ['Book 500+ routes instantly', 'Real-time seat selection', 'E-ticket on WhatsApp & email'];
const providerPerks = ['List unlimited routes & vehicles', 'Live booking dashboard', 'Automated payouts & reports'];

export default function RegisterPage() {
  return (
    <AuthLayout panel={{ headline: 'Join India\'s fastest growing bus platform.', sub: 'Whether you\'re a traveller or a bus operator, BusBook has everything you need.' }}>
      <SEO title="Create Account – BusBook" description="Choose your account type to get started with BusBook." />

      <div className="mb-8">
        <h2 className="text-3xl font-black text-gray-900 mb-1">Create your account</h2>
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">Sign in →</Link>
        </p>
      </div>

      <div className="grid gap-4">
        {/* Passenger card */}
        <Link to="/register/passenger"
          className="group relative flex items-start gap-5 p-6 rounded-2xl border-2 border-gray-100 hover:border-primary-300 bg-gray-50 hover:bg-primary-50/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary-100">
          <div className="shrink-0 h-14 w-14 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
            <User className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-900">I'm a Passenger</h3>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-sm text-gray-500 mb-3">Book tickets, manage trips, and get exclusive travel deals.</p>
            <ul className="space-y-1">
              {passengerPerks.map(p => (
                <li key={p} className="flex items-center gap-2 text-xs text-gray-600">
                  <Check className="h-3.5 w-3.5 text-primary-500 shrink-0" />{p}
                </li>
              ))}
            </ul>
          </div>
        </Link>

        {/* Provider card */}
        <Link to="/register/provider"
          className="group relative flex items-start gap-5 p-6 rounded-2xl border-2 border-gray-100 hover:border-indigo-300 bg-gray-50 hover:bg-indigo-50/30 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-100">
          <div className="shrink-0 h-14 w-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-gray-900">I'm a Bus Operator</h3>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </div>
            <p className="text-sm text-gray-500 mb-3">List your fleet, manage routes, and grow your business.</p>
            <ul className="space-y-1">
              {providerPerks.map(p => (
                <li key={p} className="flex items-center gap-2 text-xs text-gray-600">
                  <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />{p}
                </li>
              ))}
            </ul>
          </div>
        </Link>
      </div>

      <p className="mt-6 text-xs text-center text-gray-400">
        By registering you agree to our{' '}
        <Link to="/terms" className="text-primary-600 hover:underline">Terms</Link> &{' '}
        <Link to="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.
      </p>
    </AuthLayout>
  );
}
