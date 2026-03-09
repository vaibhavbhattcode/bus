import { Bus, User, Gauge } from 'lucide-react';
import BusTrackingMap from './BusTrackingMap';
import Modal from './Modal';

// Mock coordinates for cities (Duplicated for now, ideally should be in a shared constant file)
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Mysore': { lat: 12.2958, lng: 76.6394 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Goa': { lat: 15.2993, lng: 74.1240 },
  'Kochi': { lat: 9.9312, lng: 76.2673 },
  'Coimbatore': { lat: 11.0168, lng: 76.9558 },
};

interface RouteTrackingModalProps {
  route: any;
  onClose: () => void;
}

export default function RouteTrackingModal({ route, onClose }: RouteTrackingModalProps) {
  // Get coordinates or default to Bangalore-Mysore if not found
  const fromLocation = {
    ...CITY_COORDINATES[route.fromCity] || CITY_COORDINATES['Bangalore'],
    name: route.fromCity,
  };
  const toLocation = {
    ...CITY_COORDINATES[route.toCity] || CITY_COORDINATES['Mysore'],
    name: route.toCity,
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      maxWidth="max-w-4xl"
      title={
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
            Live Bus Tracking
            <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-600 rounded-full" />
              LIVE
            </span>
          </h3>
          <p className="text-sm text-gray-500">
            {route.fromCity} → {route.toCity}
          </p>
        </div>
      }
    >
        <div className="flex-1 bg-gray-50 relative min-h-[400px] -mx-6 -mt-4">
           <BusTrackingMap 
             fromLocation={fromLocation}
             toLocation={toLocation}
           />
        </div>

        <div className="p-6 bg-white border-t border-gray-100 grid grid-cols-3 gap-6 -mx-6 -mb-6">
           <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
             <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
               <Bus className="h-5 w-5" />
             </div>
             <div>
               <span className="text-xs text-gray-500 font-medium block uppercase tracking-wider">Vehicle</span>
               <span className="font-bold text-gray-900">{route.vehicle?.registrationNumber || 'KA-01-AB-1234'}</span>
             </div>
           </div>
           
           <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
             <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
               <User className="h-5 w-5" />
             </div>
             <div>
               <span className="text-xs text-gray-500 font-medium block uppercase tracking-wider">Driver</span>
               <span className="font-bold text-gray-900">Ramesh Kumar</span>
             </div>
           </div>

           <div className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
             <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
               <Gauge className="h-5 w-5" />
             </div>
             <div>
               <span className="text-xs text-gray-500 font-medium block uppercase tracking-wider">Speed</span>
               <span className="font-bold text-gray-900">65 km/h</span>
             </div>
           </div>
        </div>
    </Modal>
  );
}
