import { Users } from 'lucide-react';
import SeatSelection from './SeatSelection';
import Modal from './Modal';

interface RouteSeatsModalProps {
  route: any;
  onClose: () => void;
}

export default function RouteSeatsModal({ route, onClose }: RouteSeatsModalProps) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
            <div className="p-1.5 bg-primary-50 rounded-lg">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            Live Seat Status
          </h3>
          <p className="text-sm text-gray-500 pl-10">
            {route.fromCity} → {route.toCity} ({route.departureTime})
          </p>
        </div>
      }
    >
      <div className="flex justify-center mb-6">
        <SeatSelection
          routeId={route.id}
          selectedSeats={[]}
          onSeatSelect={() => {}} // No-op
          maxSeats={0} // Disable selection limit or effect
        />
      </div>
      
      <div className="p-4 border-t bg-gray-50 flex justify-end -mx-6 -mb-6">
        <button 
          onClick={onClose} 
          className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
