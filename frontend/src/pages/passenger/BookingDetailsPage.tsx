import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { format, differenceInHours } from 'date-fns';
import { MapPin, Download, MessageCircle, Bus, Wifi, Battery, Coffee, CloudSun, AlertCircle, ArrowRight, ShieldCheck, Ticket, CreditCard, User } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import BusTrackingMap from '../../components/BusTrackingMap';
import Modal from '../../components/Modal';
import FeedbackModal from '../../components/FeedbackModal';
import ReportModal from '../../components/ReportModal';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../../components/SEO';
import { Booking } from '../../types';

// Mock coordinates for cities
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Bangalore': { lat: 12.9716, lng: 77.5946 },
  'Mysore': { lat: 12.2958, lng: 76.6394 },
  'Chennai': { lat: 13.0827, lng: 80.2707 },
  'Hyderabad': { lat: 17.3850, lng: 78.4867 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
};

export default function BookingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.get<Booking>(`/bookings/${id}`),
    refetchInterval: 10000,
    placeholderData: (previousData: any) => previousData,
    staleTime: 5000,
  });

  const getCancellationStatus = () => {
    if (!booking || !booking.route) return { canCancel: false, reason: '', refundEstimate: 0, refundPercentage: 0 };

    // Check if booking is already cancelled or completed
    if (booking.status === 'CANCELLED') {
      return { canCancel: false, reason: 'Booking is already cancelled.', refundEstimate: 0, refundPercentage: 0 };
    }
    if (booking.status === 'COMPLETED') {
      return { canCancel: false, reason: 'Trip is completed.', refundEstimate: 0, refundPercentage: 0 };
    }

    try {
      // Improved date construction for accurate comparison
      const tripDate = new Date(booking.route.date);
      let hours = 0, minutes = 0;
      if (booking.route.departureTime) {
        const timeParts = booking.route.departureTime.split(':');
        hours = parseInt(timeParts[0] || '0', 10);
        minutes = parseInt(timeParts[1] || '0', 10);
      }
      tripDate.setHours(hours, minutes, 0, 0);

      const now = new Date();

      // Strict check: If departure time has passed, cannot cancel
      if (now >= tripDate) {
        return {
          canCancel: false,
          reason: 'Trip has already departed.',
          refundEstimate: 0,
          refundPercentage: 0
        };
      }

      const hoursUntilDeparture = differenceInHours(tripDate, now);

      let refundPercentage = 0;
      if (hoursUntilDeparture >= 24) {
        refundPercentage = 100;
      } else if (hoursUntilDeparture >= 12) {
        refundPercentage = 50;
      } else {
        refundPercentage = 0;
      }

      const refundEstimate = (booking.totalAmount * refundPercentage) / 100;

      return {
        canCancel: true,
        reason: '',
        refundEstimate,
        refundPercentage
      };
    } catch (e) {
      console.error('Error calculating cancellation status:', e);
      return { canCancel: false, reason: 'Error checking cancellation status.', refundEstimate: 0, refundPercentage: 0 }; // Safer fallback
    }
  };

  const { canCancel, reason: cancelReason, refundEstimate, refundPercentage } = getCancellationStatus();

  const calculateDuration = (dep: string, arr?: string) => {
    if (!arr) return '';
    const [depH, depM] = dep.split(':').map(Number);
    const [arrH, arrM] = arr.split(':').map(Number);
    let diffH = arrH - depH;
    let diffM = arrM - depM;
    if (diffM < 0) {
      diffM += 60;
      diffH -= 1;
    }
    if (diffH < 0) diffH += 24;
    return `${diffH}h ${diffM}m`;
  };

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrTicket, setQrTicket] = useState<{ qrDataUrl: string, ticketData: any } | null>(null);

  const fetchQrTicket = async () => {
    try {
      setQrLoading(true);
      setShowQrModal(true);
      const res = await api.get<any>(`/bookings/${id}/ticket`);
      setQrTicket(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate Boarding Pass');
      setShowQrModal(false);
    } finally {
      setQrLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.post(`/bookings/${id}/cancel`, { reason: 'User cancelled' });
      toast.success('Booking cancelled successfully');
      setShowCancelModal(false);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking');
    }
  };

  const onCancelClick = () => {
    if (!canCancel) {
      toast.error(cancelReason);
      return;
    }
    setShowCancelModal(true);
  };

  const handleDownloadTicket = async () => {
    if (!booking) return;

    const toastId = toast.loading('Generating E-Ticket with QR...');

    try {
      let qrDataUrl = '';
      try {
        const res = await api.get<any>(`/bookings/${id}/ticket`);
        qrDataUrl = res.qrDataUrl;
      } catch (err) {
        console.warn('Could not fetch QR code for PDF', err);
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Helper to check page break
      let currentY = 0;
      const checkAddPage = (y: number, requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - 20) {
          doc.addPage();
          return 20; // Reset Y to top margin
        }
        return y;
      };

      // -- Header Section --
      doc.setFillColor(63, 81, 181); // Primary Blue
      doc.rect(0, 0, pageWidth, 40, 'F');

      // Title (Left Aligned)
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('BUS BOOKING SYSTEM', 14, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('E-Ticket & Tax Invoice', 14, 26);

      // Booking Overview (Right Aligned)
      const qrSize = 32;
      const textRightX = qrDataUrl ? pageWidth - 14 - qrSize - 5 : pageWidth - 14;

      doc.setFontSize(10);
      doc.text(`Booking ID: ${booking.id.slice(0, 8).toUpperCase()}`, textRightX, 15, { align: 'right' } as any);
      doc.text(`Booked On: ${format(new Date(booking.createdAt), 'dd MMM yyyy')}`, textRightX, 20, { align: 'right' } as any);
      doc.text(`Status: ${booking.status}`, textRightX, 25, { align: 'right' } as any);

      if (qrDataUrl) {
         doc.setFillColor(255, 255, 255);
         doc.rect(pageWidth - 14 - qrSize - 1, 3, qrSize + 2, qrSize + 2, 'F'); // Make a white background box for QR just in case
         doc.addImage(qrDataUrl, 'PNG', pageWidth - 14 - qrSize, 4, qrSize, qrSize);
      }

      currentY = 55;

      // -- Journey Details --
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Journey Details', 14, currentY);

      doc.setDrawColor(200, 200, 200);
      doc.line(14, currentY + 3, pageWidth - 14, currentY + 3);

      autoTable(doc, {
        startY: currentY + 8,
        head: [['From', 'To', 'Travel Date', 'Departure', 'Arrival', 'Bus Type']],
        body: [[
          booking.route?.fromCity || 'N/A',
          booking.route?.toCity || 'N/A',
          format(new Date(booking.route?.date || new Date()), 'EEE, dd MMM yyyy'),
          booking.route?.departureTime || 'N/A',
          booking.route?.arrivalTime || 'N/A',
          booking.route?.vehicle?.type || 'Luxury Bus'
        ]],
        theme: 'grid',
        headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 6 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // -- Provider Info --
      currentY = checkAddPage(currentY, 20);
      if (booking.route?.vehicle?.provider) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Operator: ${booking.route.vehicle.provider.companyName}`, 14, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(`Contact: ${booking.route.vehicle.provider.contactPhone}`, 14, currentY + 5);
        currentY += 15;
      }

      // -- Passenger Details --
      currentY = checkAddPage(currentY, 40); // Title + Table Header space
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Passenger Details', 14, currentY);
      doc.line(14, currentY + 3, pageWidth - 14, currentY + 3);

      autoTable(doc, {
        startY: currentY + 8,
        head: [['Passenger Name', 'Contact', 'Email', 'Seat Number(s)', 'Total Seats']],
        body: [[
          booking.passengerName,
          booking.passengerPhone,
          booking.passengerEmail || '-',
          booking.seatNumbers?.join(', ') || 'Unassigned',
          booking.seats
        ]],
        theme: 'grid',
        headStyles: { fillColor: [63, 81, 181], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 6 },
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;

      // -- Payment Summary --
      currentY = checkAddPage(currentY, 40);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Breakdown', 14, currentY);
      doc.line(14, currentY + 3, pageWidth - 14, currentY + 3);

      autoTable(doc, {
        startY: currentY + 8,
        head: [['Description', 'Amount (INR)']],
        body: [
          ['Ticket Fare', `${booking.totalAmount.toFixed(2)}`],
          ['Service Tax & Fees', '0.00'],
          ['Total Amount Paid', `${booking.totalAmount.toFixed(2)}`]
        ],
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 140 },
          1: { halign: 'right', fontStyle: 'bold' }
        },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      // -- Important Information / Footer --
      currentY = (doc as any).lastAutoTable.finalY + 20;
      const footerHeight = 50;

      // Check if footer fits, otherwise new page
      if (currentY + footerHeight > pageHeight - 10) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(245, 245, 245);
      doc.rect(14, currentY, pageWidth - 28, footerHeight, 'F');

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('Important Instructions:', 20, currentY + 10);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      const instructions = [
        "1. Please carry a valid government-issued photo ID.",
        "2. Report at the boarding point 15 minutes before departure.",
        "3. This ticket is non-transferable.",
        "4. For support, contact support@busbooking.com or call +91-1234567890."
      ];

      let instrY = currentY + 18;
      instructions.forEach(instr => {
        doc.text(instr, 20, instrY);
        instrY += 5;
      });

      // Footer Branding (inside the box at bottom, or just below text)
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by Bus Booking System', pageWidth / 2, currentY + footerHeight - 5, { align: 'center' });

      doc.save(`Ticket_${booking.id.slice(0, 8)}.pdf`);
      toast.dismiss(toastId);
      toast.success('Ticket downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.dismiss(toastId);
      toast.error('Failed to generate ticket');
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    if (!booking) return;

    const res = await loadRazorpayScript();
    if (!res) {
      toast.error('Razorpay SDK failed to load. Are you online?');
      return;
    }

    try {
      // Create order on backend
      const orderData = await api.post<any>('/payments/create-order', {
        bookingId: booking.id,
        amount: booking.totalAmount,
      });

      console.log('Order created:', orderData);

      const { orderId, currency, amount, keyId } = orderData;

      const options = {
        key: keyId,
        amount: amount.toString(),
        currency: currency,
        name: 'Bus Booking System',
        description: `Booking #${booking.id.slice(0, 8)}`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: booking.id,
            });

            toast.success('Payment successful!');
            window.location.reload();
          } catch (error) {
            console.error('Payment verification failed:', error);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: booking.passengerName,
          email: booking.passengerEmail,
          contact: booking.passengerPhone,
        },
        theme: {
          color: '#3f51b5',
        },
        modal: {
          ondismiss: function () {
            toast('Payment cancelled');
          }
        }
      };

      if (!(window as any).Razorpay) {
        toast.error('Razorpay SDK not loaded');
        return;
      }

      const paymentObject = new (window as any).Razorpay(options);

      paymentObject.on('payment.failed', function (response: any) {
        toast.error(response.error.description);
      });

      paymentObject.open();
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error('Failed to initiate payment');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-12 w-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 animate-pulse">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="p-4 bg-red-50 rounded-full w-fit mx-auto">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Booking Not Found</h2>
          <p className="text-gray-500">The booking you are looking for does not exist or has been removed.</p>
          <button onClick={() => navigate('/bookings')} className="btn btn-primary">
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  // Mock data for features not yet in API
  const amenities = [
    { icon: Wifi, label: 'Free Wi-Fi' },
    { icon: Battery, label: 'Charging Point' },
    { icon: Coffee, label: 'Snacks' },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 relative overflow-hidden font-sans">
      <SEO
        title={`Booking #${booking.id.slice(0, 8)} - Bus Booking`}
        description="View your booking details, download ticket, and track your bus."
      />

      {/* Abstract Background Shapes */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[80px] opacity-40 translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[80px] opacity-40 -translate-x-1/4 translate-y-1/4"></div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <motion.h2 variants={itemVariants} className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-xl text-primary-600">
                <Ticket className="h-6 w-6" />
              </div>
              Booking Details
            </motion.h2>
            <motion.p variants={itemVariants} className="text-gray-500 mt-2 font-medium">
              Reference ID: <span className="font-mono text-gray-700 select-all">#{booking.id.slice(0, 8).toUpperCase()}</span>
            </motion.p>
          </div>
          <motion.div variants={itemVariants} className="flex gap-3">
            {booking.status === 'CONFIRMED' && (
              <button
                onClick={fetchQrTicket}
                className="btn bg-gradient-to-r from-primary-600 to-indigo-600 text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Ticket className="h-4 w-4" />
                View Boarding Pass
              </button>
            )}
            <button
              onClick={handleDownloadTicket}
              className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Ticket
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="btn bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Support
            </button>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Booking Info - Left Column */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
            {/* Digital Ticket Card */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100 relative group">
              {/* Decorative Ticket Stub Lines */}
              <div className="absolute top-0 right-0 bottom-0 w-16 bg-gray-50 border-l-2 border-dashed border-gray-200 hidden sm:block"></div>
              <div className="absolute top-1/2 right-[-10px] w-5 h-5 bg-gray-100 rounded-full sm:block hidden transform -translate-y-1/2"></div>
              <div className="absolute top-1/2 left-[-10px] w-5 h-5 bg-gray-100 rounded-full sm:block hidden transform -translate-y-1/2"></div>

              {/* Status Badge */}
              <div className="absolute top-6 right-6 z-10">
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm backdrop-blur-md ${booking.status === 'CONFIRMED' ? 'bg-green-100/80 text-green-700 border border-green-200' :
                    booking.status === 'CANCELLED' ? 'bg-red-100/80 text-red-700 border border-red-200' :
                      'bg-yellow-100/80 text-yellow-700 border border-yellow-200'
                  }`}>
                  {booking.status}
                </span>
              </div>

              <div className="p-8 sm:pr-24 relative">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-16 w-16 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 shadow-inner">
                    <Bus className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{booking.route?.vehicle?.provider?.companyName || 'Premium Bus Operator'}</h3>
                    <div className="flex items-center gap-2 text-gray-500 mt-1">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Verified Operator</span>
                    </div>
                  </div>
                </div>

                {booking.route && (
                  <div className="space-y-8">
                    {/* Route Visualization */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative">
                      {/* Connecting Line */}
                      <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 to-primary-200 sm:left-10 sm:right-10 sm:top-[27px] sm:h-0.5 sm:w-auto sm:bg-gradient-to-r"></div>

                      <div className="relative z-10 flex flex-row sm:flex-col items-center gap-4 sm:gap-2 w-full sm:w-auto">
                        <div className="h-10 w-10 rounded-full bg-white border-4 border-primary-500 shadow-md flex-shrink-0"></div>
                        <div className="text-left sm:text-center">
                          <p className="text-2xl font-bold text-gray-900">{booking.route.departureTime}</p>
                          <p className="font-semibold text-gray-700">{booking.route.fromCity}</p>
                          <p className="text-xs text-gray-500">{format(new Date(booking.route.date), 'EEE, MMM dd')}</p>
                        </div>
                      </div>

                      <div className="relative z-10 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm text-xs font-medium text-gray-500 self-start sm:self-auto ml-10 sm:ml-0">
                        {calculateDuration(booking.route.departureTime, booking.route.arrivalTime)}
                      </div>

                      <div className="relative z-10 flex flex-row sm:flex-col items-center gap-4 sm:gap-2 w-full sm:w-auto">
                        <div className="h-10 w-10 rounded-full bg-white border-4 border-gray-300 shadow-md flex-shrink-0"></div>
                        <div className="text-left sm:text-center">
                          <p className="text-2xl font-bold text-gray-900">{booking.route.arrivalTime || '--:--'}</p>
                          <p className="font-semibold text-gray-700">{booking.route.toCity}</p>
                          <p className="text-xs text-gray-500">{format(new Date(booking.route.date), 'EEE, MMM dd')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                      {amenities.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
                          <item.icon className="h-3.5 w-3.5" />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Passenger Info */}
            <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-lg shadow-gray-200/50 border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary-500" />
                Passenger Details
              </h4>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-semibold text-gray-900 text-lg">{booking.passengerName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Contact Number</p>
                  <p className="font-semibold text-gray-900 text-lg">{booking.passengerPhone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-semibold text-gray-900 text-lg">{booking.passengerEmail || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Seat Number(s)</p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-lg border border-primary-100">
                      {booking.seatNumbers?.join(', ') || booking.seats}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Sidebar - Right Column */}
          <motion.div variants={itemVariants} className="space-y-6">

            {/* Payment Summary */}
            <div className="bg-white rounded-3xl p-6 shadow-lg shadow-gray-200/50 border border-gray-100">
              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-400" />
                Payment Summary
              </h4>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Base Fare</span>
                  <span>₹{booking.totalAmount}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax & Fees</span>
                  <span>₹0</span>
                </div>
                <div className="border-t border-dashed border-gray-200 my-2"></div>
                <div className="flex justify-between font-bold text-lg text-gray-900">
                  <span>Total Amount</span>
                  <span>₹{booking.totalAmount}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-xs ${booking.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {booking.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Method</span>
                  <span className="font-medium text-gray-900 capitalize">{booking.paymentMethod || 'Online'}</span>
                </div>
              </div>

              {booking.paymentStatus === 'PENDING' && booking.status !== 'CANCELLED' && booking.paymentMethod === 'online' && (
                <button
                  onClick={handlePayment}
                  className="w-full py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all font-bold flex items-center justify-center gap-2"
                >
                  Pay Now <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Live Tracking Card */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-gray-200/50 border border-gray-100">
              <div className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <span className="font-bold">Live Tracking</span>
                </div>
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>

              <div className="h-64 bg-gray-100 relative">
                {booking?.route && (
                  <BusTrackingMap
                    routeId={booking.route.id}
                    fromLocation={{
                      ...(CITY_COORDINATES[booking.route.fromCity] || { lat: 12.9716, lng: 77.5946 }),
                      name: booking.route.fromCity
                    }}
                    toLocation={{
                      ...(CITY_COORDINATES[booking.route.toCity] || { lat: 12.2958, lng: 76.6394 }),
                      name: booking.route.toCity
                    }}
                  />
                )}
              </div>
            </div>

            {/* Weather Card */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 shadow-lg shadow-blue-500/20 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-medium opacity-90 flex items-center gap-2 mb-4">
                  <CloudSun className="h-5 w-5" />
                  Weather in {booking?.route?.toCity}
                </h4>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-bold">28°C</span>
                  <div className="mb-1 opacity-90 text-sm">
                    <p>Sunny</p>
                    <p>Humidity: 45%</p>
                  </div>
                </div>
              </div>
              <CloudSun className="absolute -right-4 -bottom-4 h-32 w-32 text-white opacity-10" />
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {booking?.status !== 'CANCELLED' && (
                <div>
                  <button
                    onClick={onCancelClick}
                    disabled={!canCancel}
                    className={`w-full py-3 border rounded-xl font-medium text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${!canCancel
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200'
                      }`}
                    title={!canCancel ? cancelReason : 'Cancel this booking'}
                  >
                    <AlertCircle className={`h-4 w-4 ${!canCancel ? 'text-gray-400' : 'text-red-500'}`} />
                    {booking?.status === 'COMPLETED' ? 'Trip Completed' : 'Cancel Booking'}
                  </button>
                  {!canCancel && (
                    <p className="text-xs text-center text-gray-400 mt-2 px-2">
                      {cancelReason}
                    </p>
                  )}
                </div>
              )}

              {booking?.status === 'COMPLETED' && (
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="w-full py-3 bg-white border border-primary-200 text-primary-600 rounded-xl hover:bg-primary-50 transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  Rate Your Trip
                </button>
              )}
            </div>

          </motion.div>
        </div>

        {/* QR Ticket Modal */}
        <Modal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          title="Digital Boarding Pass"
          maxWidth="max-w-md"
        >
          <div className="flex flex-col items-center justify-center p-4">
            {qrLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="h-10 w-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 animate-pulse font-medium">Generating Secure Ticket...</p>
              </div>
            ) : qrTicket ? (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100"
                >
                  <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-6 text-white text-center rounded-b-[40px] shadow-inner">
                    <h3 className="text-2xl font-bold tracking-tight">BusBook Pass</h3>
                    <p className="opacity-90 mt-1">Show this to the conductor</p>
                  </div>

                  <div className="p-8 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                    <div className="bg-white p-4 rounded-3xl shadow-lg border border-gray-100 transform hover:scale-105 transition-transform duration-300">
                      <img src={qrTicket.qrDataUrl} alt="Boarding Pass QR" className="w-56 h-56 object-contain" />
                    </div>

                    <div className="w-full mt-8 pt-6 border-t border-dashed border-gray-200 space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Passenger Info</span>
                        <span className="font-bold text-gray-900">{booking.passengerName}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Seats</span>
                        <span className="font-bold text-primary-600 bg-primary-50 px-2 rounded">{booking.seatNumbers?.join(', ') || booking.seats}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Date</span>
                        <span className="font-bold text-gray-900">{booking.route ? format(new Date(booking.route.date), 'dd MMM yyyy') : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100 font-mono flex items-center justify-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                    Cryptographically Indexed • {booking.id.split('-')[0].toUpperCase()}
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="text-center text-red-500 py-8">Failed to load Boarding Pass.</div>
            )}
          </div>
        </Modal>

        {/* Cancel Modal */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title={
            <div className="flex items-center gap-4 text-red-600">
              <div className="p-2 bg-red-50 rounded-full">
                <AlertCircle className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-gray-900">Cancel Booking?</span>
            </div>
          }
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-gray-600">Are you sure you want to cancel your journey to <span className="font-bold text-gray-900">{booking?.route?.toCity}</span>?</p>

            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Refund Estimate</p>
              <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-gray-600">Booking Amount</span>
                <span className="font-medium">₹{booking?.totalAmount}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-sm text-red-600">
                <span>Cancellation Fee ({100 - refundPercentage}%)</span>
                <span>- ₹{(booking?.totalAmount || 0) - refundEstimate}</span>
              </div>
              <div className="border-t border-gray-200 my-2 pt-2 flex justify-between items-center font-bold text-green-600 text-lg">
                <span>Refund Amount</span>
                <span>₹{refundEstimate}</span>
              </div>
            </div>

            <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg">
              <p>Refunds are processed within 5-7 business days.</p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium shadow-lg shadow-red-500/30 transition-all hover:scale-105"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </Modal>

        {booking && (
          <>
            <FeedbackModal
              isOpen={showFeedbackModal}
              onClose={() => setShowFeedbackModal(false)}
              bookingId={booking.id}
              providerId={booking.route?.vehicle?.providerId}
              routeId={booking.route?.id}
            />
            <ReportModal
              isOpen={showReportModal}
              onClose={() => setShowReportModal(false)}
              bookingId={booking.id}
              providerId={booking.route?.vehicle?.providerId}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}
