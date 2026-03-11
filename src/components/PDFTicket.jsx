import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import './PDFTicket.css';

const PDFTicket = ({ booking, event, seats, onClose }) => {
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add logo/header
    doc.setFillColor(255, 77, 77);
    doc.rect(0, 0, 220, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('STADIUM EVENTS', 105, 25, { align: 'center' });
    
    // Ticket type
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('ADMIT ONE', 105, 55, { align: 'center' });
    
    // Draw ticket border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(15, 65, 180, 120);
    
    // Event details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(event.name, 25, 80);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${new Date(event.date).toLocaleString()}`, 25, 90);
    doc.text(`Venue: ${event.venue || 'Main Stadium'}`, 25, 97);
    
    // Customer details
    doc.text(`Name: ${booking.customer_name || booking.customerName}`, 25, 110);
    doc.text(`Booking Ref: ${booking.booking_reference || booking.bookingReference}`, 25, 117);
    
    // Seats table
    doc.autoTable({
      startY: 130,
      margin: { left: 25 },
      head: [['Section', 'Row', 'Seat', 'Price']],
      body: seats.map(seat => [
        seat.section,
        seat.row_number || seat.row,
        seat.seat_number || seat.seat,
        `$${seat.price}`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [255, 77, 77] },
      styles: { fontSize: 10 }
    });
    
    // Total
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: $${(booking.total_amount || booking.totalAmount || 0).toFixed(2)}`, 25, finalY);
    
    // Add QR code placeholder note
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text('Present this ticket with QR code at entrance', 105, finalY + 20, { align: 'center' });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This ticket is valid only for the specified event and seating.', 105, 280, { align: 'center' });
    
    // Save PDF
    doc.save(`ticket-${booking.booking_reference || booking.bookingReference}.pdf`);
  };

  return (
    <div className="pdf-modal-overlay">
      <div className="pdf-modal">
        <div className="pdf-modal-header">
          <h2>Download Ticket</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>
        
        <div className="pdf-modal-content">
          <div className="ticket-preview">
            <div className="preview-header">
              <div className="preview-logo">STADIUM EVENTS</div>
            </div>
            
            <div className="preview-body">
              <h3>{event.name}</h3>
              <p><strong>Date:</strong> {new Date(event.date).toLocaleString()}</p>
              <p><strong>Venue:</strong> {event.venue || 'Main Stadium'}</p>
              <p><strong>Booking Ref:</strong> {booking.booking_reference || booking.bookingReference}</p>
              
              <div className="preview-seats">
                <h4>Seats:</h4>
                <div className="seat-list">
                  {seats.map((seat, i) => (
                    <span key={i} className="preview-seat">
                      {seat.section} - Row {seat.row_number || seat.row}, Seat {seat.seat_number || seat.seat}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="preview-total">
                <strong>Total: ${(booking.total_amount || booking.totalAmount || 0).toFixed(2)}</strong>
              </div>
            </div>
            
            <div className="preview-footer">
              <div className="qr-placeholder">[QR Code will be included in download]</div>
            </div>
          </div>
          
          <div className="pdf-actions">
            <button onClick={generatePDF} className="download-btn">
              📥 Download PDF Ticket
            </button>
            <button onClick={onClose} className="cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFTicket;