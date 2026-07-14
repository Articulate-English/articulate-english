import { Booking } from './types';

// In-memory storage (lost on restart - for demo)
let bookings: Booking[] = [];

export function getBookings(): Booking[] {
  return [...bookings].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getPendingBookings(): Booking[] {
  return bookings.filter(b => b.status !== 'synced');
}

export function addBooking(booking: Booking): void {
  const exists = bookings.find(b => b.id === booking.id);
  if (!exists) {
    bookings.push(booking);
  }
}

export function updateBookingStatus(
  id: string, 
  status: 'pending' | 'acknowledged' | 'synced',
  notes?: string
): void {
  const booking = bookings.find(b => b.id === id);
  if (booking) {
    booking.status = status;
    if (status === 'acknowledged') {
      booking.acknowledgedAt = new Date().toISOString();
    }
    if (status === 'synced') {
      booking.syncedAt = new Date().toISOString();
    }
    if (notes) {
      booking.notes = notes;
    }
  }
}

export function deleteBooking(id: string): void {
  bookings = bookings.filter(b => b.id !== id);
}

export function hasPendingBookings(): boolean {
  return bookings.some(b => b.status !== 'synced');
}
