import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Lock, Check, Info, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Seat {
  number: string;
  available: boolean;
  booked: boolean;
  locked: boolean;
}

interface SeatAvailability {
  routeId: string;
  totalSeats: number;
  availableSeats: number;
  seatLayout: string;
  seats: Seat[];
  bookedSeats: string[];
  lockedSeats: string[];
}

interface SeatSelectionProps {
  routeId: string;
  selectedSeats: string[];
  onSeatSelect: (seatNumbers: string[]) => void;
  maxSeats?: number;
  showLegend?: boolean;
}

// Layout configurations
const LAYOUTS: Record<string, { left: number; right: number; description: string }> = {
  '2+2': { left: 2, right: 2, description: '2 seats left, aisle, 2 seats right' },
  '2+1': { left: 2, right: 1, description: '2 seats left, aisle, 1 seat right' },
  '1+1': { left: 1, right: 1, description: '1 seat left, aisle, 1 seat right (Sleeper)' },
  '2+3': { left: 2, right: 3, description: '2 seats left, aisle, 3 seats right' },
  'sleeper': { left: 1, right: 1, description: 'Sleeper berths (1+1)' },
};

export default function SeatSelection({
  routeId,
  selectedSeats,
  onSeatSelect,
  maxSeats,
  showLegend = true,
}: SeatSelectionProps) {
  // Fetch seat availability with polling for real-time updates
  const { data: seatData, refetch } = useQuery<SeatAvailability>({
    queryKey: ['seat-availability', routeId],
    queryFn: () => api.get(`/routes/${routeId}/seats`),
    enabled: !!routeId,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates (optimized from 3s)
    placeholderData: (previousData: any) => previousData,
  });

  const [isRecommending, setIsRecommending] = useState(false);

  const handleSmartRecommend = async () => {
    if (!maxSeats || maxSeats <= 0) {
      toast.error('Please select the number of passengers first.');
      return;
    }

    try {
      setIsRecommending(true);
      const res: any = await api.get(`/routes/${routeId}/seat-recommend?count=${maxSeats}`);

      const recommendedSeats = res.recommendedSeats;
      if (!recommendedSeats || recommendedSeats.length === 0) {
        toast.error('Could not find enough contiguous seats.');
        return;
      }

      // Automatically lock these recommended seats
      await api.post(`/routes/${routeId}/lock-seats`, { seatNumbers: recommendedSeats });

      onSeatSelect(recommendedSeats);
      toast.success(res.reason || `Successfully locked ${recommendedSeats.length} recommended seats.`);
      refetch();
    } catch (error) {
      toast.error(api.getErrorMessage(error) || 'Smart recommendation failed.');
    } finally {
      setIsRecommending(false);
    }
  };

  const handleSeatClick = async (seatNumber: string, available: boolean, booked: boolean, locked: boolean) => {
    if (booked || (locked && !selectedSeats.includes(seatNumber))) {
      toast.error(`Seat ${seatNumber} is ${booked ? 'already booked' : 'currently locked'}`);
      return;
    }

    if (!available && !selectedSeats.includes(seatNumber)) {
      toast.error(`Seat ${seatNumber} is not available`);
      return;
    }

    const isSelected = selectedSeats.includes(seatNumber);
    const previousSeats = [...selectedSeats];

    // 🔥 Optimistic UI Update: Instant visual feedback before API response
    if (isSelected) {
      onSeatSelect(selectedSeats.filter((s) => s !== seatNumber));
    } else {
      if (maxSeats && selectedSeats.length >= maxSeats) {
        toast.error(`You can only select up to ${maxSeats} seats`);
        return;
      }
      onSeatSelect([...selectedSeats, seatNumber]);
    }

    try {
      if (isSelected) {
        // Unlock seat
        await api.post(`/routes/${routeId}/unlock-seats`, { seatNumbers: [seatNumber] });
      } else {
        // Lock seat
        await api.post(`/routes/${routeId}/lock-seats`, { seatNumbers: [seatNumber] });
      }
      refetch();
    } catch (error) {
      // 🔄 Revert optimistic update on failure
      onSeatSelect(previousSeats);
      toast.error(api.getErrorMessage(error) || 'Failed to lock seat, please try again.');
      refetch();
    }
  };

  const getSeatStatus = (seat: Seat) => {
    if (seat.booked) return 'booked';
    if (seat.locked) return 'locked';
    if (selectedSeats.includes(seat.number)) return 'selected';
    if (seat.available) return 'available';
    return 'unavailable';
  };

  const getSeatClassName = (seat: Seat) => {
    const status = getSeatStatus(seat);
    const baseClasses =
      'w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-200 cursor-pointer border-2';

    switch (status) {
      case 'selected':
        return `${baseClasses} bg-primary-600 text-white border-primary-700 hover:bg-primary-700 shadow-lg transform scale-105`;
      case 'booked':
        return `${baseClasses} bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed`;
      case 'locked':
        return `${baseClasses} bg-yellow-100 text-yellow-600 border-yellow-200 cursor-not-allowed opacity-75`;
      case 'available':
        return `${baseClasses} bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:text-primary-600 hover:shadow-md`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed`;
    }
  };

  const getSeatIcon = (seat: Seat) => {
    const status = getSeatStatus(seat);
    if (status === 'selected') {
      return <Check className="h-5 w-5" />;
    }
    if (status === 'locked') {
      return <Lock className="h-4 w-4" />;
    }
    return <span className="text-xs">{seat.number}</span>;
  };

  const renderSeatLayout = () => {
    if (!seatData) return null;

    const layout = LAYOUTS[seatData.seatLayout] || LAYOUTS['2+2'];
    const seatsPerRow = layout.left + layout.right;
    const totalRows = Math.ceil(seatData.totalSeats / seatsPerRow);
    const seats = seatData.seats;

    return (
      <div className="overflow-x-auto pb-4 custom-scrollbar px-2">
        <div className="min-w-[320px] p-2">
          <div className="space-y-4">
            {Array.from({ length: totalRows }).map((_, rowIndex) => {
              const startSeat = rowIndex * seatsPerRow;
              const leftSeats = seats.slice(startSeat, startSeat + layout.left);
              const rightSeats = seats.slice(startSeat + layout.left, startSeat + seatsPerRow);

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rowIndex * 0.05, duration: 0.3 }}
                  key={rowIndex}
                  className="flex items-center gap-6 justify-center min-w-max"
                >
                  {/* Row number */}
                  <div className="w-8 text-xs font-bold text-gray-400 text-center sticky left-0 z-10">
                    {String(rowIndex + 1).padStart(2, '0')}
                  </div>

                  {/* Left side seats */}
                  <div className="flex gap-3">
                    {leftSeats.map((seat) => (
                      <motion.button
                        whileHover={{ scale: (seat.booked || seat.locked || !seat.available) ? 1 : 1.05 }}
                        whileTap={{ scale: (seat.booked || seat.locked || !seat.available) ? 1 : 0.95 }}
                        key={seat.number}
                        type="button"
                        onClick={() =>
                          handleSeatClick(seat.number, seat.available, seat.booked, seat.locked)
                        }
                        disabled={seat.booked || seat.locked || !seat.available}
                        className={getSeatClassName(seat)}
                        title={
                          seat.booked
                            ? `Seat ${seat.number} (Booked)`
                            : seat.locked
                              ? `Seat ${seat.number} (Locked)`
                              : `Seat ${seat.number}`
                        }
                      >
                        {getSeatIcon(seat)}
                      </motion.button>
                    ))}
                  </div>

                  {/* Aisle */}
                  <div className="w-8 flex justify-center">
                    <div className="w-px h-full bg-gradient-to-b from-transparent via-gray-200 to-transparent"></div>
                  </div>

                  {/* Right side seats */}
                  <div className="flex gap-3">
                    {rightSeats.map((seat) => (
                      <motion.button
                        whileHover={{ scale: (seat.booked || seat.locked || !seat.available) ? 1 : 1.05 }}
                        whileTap={{ scale: (seat.booked || seat.locked || !seat.available) ? 1 : 0.95 }}
                        key={seat.number}
                        type="button"
                        onClick={() =>
                          handleSeatClick(seat.number, seat.available, seat.booked, seat.locked)
                        }
                        disabled={seat.booked || seat.locked || !seat.available}
                        className={getSeatClassName(seat)}
                        title={
                          seat.booked
                            ? `Seat ${seat.number} (Booked)`
                            : seat.locked
                              ? `Seat ${seat.number} (Locked)`
                              : `Seat ${seat.number}`
                        }
                      >
                        {getSeatIcon(seat)}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (!seatData) {
    return (
      <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
        <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-gray-500 font-medium">Loading seat map...</p>
      </div>
    );
  }

  const layout = LAYOUTS[seatData.seatLayout] || LAYOUTS['2+2'];

  return (
    <div className="space-y-8">
      {/* Legend */}
      {showLegend && (
        <div className="flex flex-wrap gap-6 text-sm bg-white/60 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-gray-100 justify-center sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-white border-2 border-gray-200 shadow-sm"></div>
            <span className="text-gray-600 font-medium">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary-600 border-2 border-primary-700 shadow-[0_0_10px_rgba(var(--color-primary-600),0.3)]"></div>
            <span className="text-gray-900 font-bold">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gray-100 border-2 border-gray-200"></div>
            <span className="text-gray-400 font-medium">Booked</span>
          </div>
        </div>
      )}

      {/* Seat Map */}
      <div className="bg-gradient-to-b from-gray-50/50 to-white rounded-3xl border border-gray-200/60 shadow-xl shadow-gray-200/30 p-8 relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-400 via-primary-600 to-indigo-600"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/3"></div>

        <div className="flex items-center justify-between mb-10 relative z-10">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Select Seats</h3>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-xs text-primary-700 font-bold bg-primary-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 border border-primary-100">
                <Info className="h-4 w-4" /> {layout.description}
              </p>

              {maxSeats && maxSeats > 0 && selectedSeats.length === 0 && (
                <button
                  onClick={handleSmartRecommend}
                  disabled={isRecommending || seatData.availableSeats < maxSeats}
                  className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Zap className={`h-4 w-4 ${isRecommending ? 'animate-pulse' : 'group-hover:text-amber-500'}`} />
                  {isRecommending ? 'Finding...' : 'Smart Recommend'}
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Selection</div>
            <div className="text-sm font-bold text-white bg-gray-900 px-4 py-2 rounded-xl shadow-md">
              <span className="text-primary-400">{selectedSeats.length}</span> / {maxSeats || seatData.availableSeats}
            </div>
          </div>
        </div>

        {/* Driver/Steering Wheel Indicator */}
        <div className="flex justify-end mb-10 px-8 relative opacity-60">
          <div className="w-14 h-14 rounded-full border-[5px] border-gray-300 flex items-center justify-center relative shadow-inner">
            <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>
            <div className="absolute w-1.5 h-10 bg-gray-300 rounded-full"></div>
          </div>
          <div className="absolute right-24 text-[10px] font-bold text-gray-400 uppercase tracking-widest flex flex-col items-center">
            <span>Front</span>
            <div className="h-8 w-px bg-gradient-to-b from-gray-300 to-transparent mt-2"></div>
          </div>
        </div>

        {/* Seat Layout */}
        <div className="relative z-10">
          {renderSeatLayout()}
        </div>

        {/* Selected Seats Summary */}
        <AnimatePresence>
          {selectedSeats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: 20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: 20 }}
              className="mt-8 pt-8 border-t border-gray-200/50"
            >
              <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" /> Selected Seats
              </p>
              <div className="flex flex-wrap gap-2.5">
                {selectedSeats
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((seatNumber) => (
                    <motion.span
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      key={seatNumber}
                      className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-gray-900/20"
                    >
                      Seat {seatNumber}
                    </motion.span>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Real-time indicator */}
      <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        Live seat availability
      </div>
    </div>
  );
}
