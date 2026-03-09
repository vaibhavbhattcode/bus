import ProviderRegistrationPrompt from '../../components/ProviderRegistrationPrompt';
import SEO from '../../components/SEO';

export default function ProviderRegistrationPage() {
  return (
    <div className="space-y-6">
      <SEO 
        title="Provider Registration" 
        description="Register as a bus operator on BusBook to grow your business and reach more passengers. Complete your profile to start listing vehicles."
      />
      <div>
        <h2 className="text-2xl font-bold">Provider Registration</h2>
        <p className="text-gray-600">Complete your provider profile to start listing vehicles and routes.</p>
      </div>

      <ProviderRegistrationPrompt />
    </div>
  );
}

