import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Generic CSV Export
export const exportToCSV = (data: any[], filename: string, columns: { header: string; key: string }[]) => {
  const csvContent = [
    columns.map((col) => col.header).join(','),
    ...data.map((row) =>
      columns
        .map((col) => {
          let value = row[col.key];
          // Handle nested keys (e.g., 'user.name')
          if (col.key.includes('.')) {
            value = col.key.split('.').reduce((obj: any, key: string) => (obj ? obj[key] : ''), row);
          }
          // Escape quotes and wrap in quotes
          return `"${String(value || '').replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Generic PDF Export
export const exportToPDF = (
  title: string,
  data: any[],
  columns: { header: string; dataKey: string }[],
  filename: string
) => {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.text(`Generated on: ${format(new Date(), 'PPpp')}`, 14, 30);

  // Table
  autoTable(doc, {
    startY: 40,
    head: [columns.map((col) => col.header)],
    body: data.map((row) =>
      columns.map((col) => {
        let value = row[col.dataKey];
         if (col.dataKey.includes('.')) {
            value = col.dataKey.split('.').reduce((obj: any, key: string) => (obj ? obj[key] : ''), row);
          }
        return value || '-';
      })
    ),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [66, 139, 202] }, // Primary blueish color
  });

  doc.save(`${filename}.pdf`);
};

// Specialized Trip Manifest PDF for Conductors
export const generateTripManifest = (route: any, bookings: any[]) => {
  const doc = new jsPDF();
  const providerName = route.vehicle?.provider?.companyName || 'Bus Provider';
  const busInfo = `${route.vehicle?.name || 'Bus'} (${route.vehicle?.registrationNumber || 'No Reg'})`;
  const routeInfo = `${route.fromCity} ➔ ${route.toCity}`;
  const dateInfo = format(new Date(route.date), 'PPP');
  const timeInfo = `Dep: ${route.departureTime} | Arr: ${route.arrivalTime || 'N/A'}`;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(providerName.toUpperCase(), 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text('PASSENGER MANIFEST / TRIP SHEET', 105, 30, { align: 'center' });

  // Trip Details Box
  doc.setDrawColor(200);
  doc.setFillColor(245, 245, 245);
  doc.rect(14, 35, 182, 35, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  doc.text(`Route:`, 20, 45);
  doc.setFont('helvetica', 'bold');
  doc.text(routeInfo, 50, 45);
  doc.setFont('helvetica', 'normal');

  doc.text(`Date:`, 120, 45);
  doc.setFont('helvetica', 'bold');
  doc.text(dateInfo, 140, 45);
  doc.setFont('helvetica', 'normal');

  doc.text(`Bus:`, 20, 55);
  doc.setFont('helvetica', 'bold');
  doc.text(busInfo, 50, 55);
  doc.setFont('helvetica', 'normal');

  doc.text(`Time:`, 120, 55);
  doc.setFont('helvetica', 'bold');
  doc.text(timeInfo, 140, 55);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Total Bookings:`, 20, 65);
  doc.setFont('helvetica', 'bold');
  doc.text(`${bookings.length} Passengers`, 50, 65);
  doc.setFont('helvetica', 'normal');

  // Prepare Data for Table
  // Sort by seat number
  const sortedBookings = [...bookings].sort((a, b) => {
    const seatA = parseInt(a.seatNumbers?.[0] || '0');
    const seatB = parseInt(b.seatNumbers?.[0] || '0');
    return seatA - seatB;
  });

  const tableData = sortedBookings.map((b) => [
    b.seatNumbers?.join(', ') || '-',
    b.passengerName,
    `${b.passengerGender?.charAt(0).toUpperCase()}/${b.passengerAge}`,
    b.passengerPhone,
    b.pickupLocation || route.fromCity, // Assuming boarding point might be tracked later
    b.dropLocation || route.toCity,
    b.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
    b.id.slice(-6).toUpperCase() // PNR / Ref
  ]);

  // Passenger Table
  autoTable(doc, {
    startY: 75,
    head: [['Seat', 'Name', 'M/F/Age', 'Phone', 'Boarding', 'Dropping', 'Pay', 'PNR']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 15 }, // Seat
      2: { halign: 'center', cellWidth: 20 }, // Age/Gen
      6: { halign: 'center', cellWidth: 20 }, // Pay
      7: { fontStyle: 'italic', cellWidth: 25 } // PNR
    },
    alternateRowStyles: { fillColor: [250, 250, 250] }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Printed on ${format(new Date(), 'PPpp')} - Page ${i} of ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`Manifest_${route.fromCity}_${route.toCity}_${dateInfo}.pdf`);
};
