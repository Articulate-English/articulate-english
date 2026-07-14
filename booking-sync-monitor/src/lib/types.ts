export interface Booking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  attendeeName: string;
  attendeeEmail: string;
  status: 'pending' | 'acknowledged' | 'synced';
  createdAt: string;
  acknowledgedAt?: string;
  syncedAt?: string;
  notes?: string;
}

export interface CalWebhookPayload {
  triggerEvent: 'BOOKING_CREATED' | 'BOOKING_CANCELLED' | 'BOOKING_RESCHEDULED';
  payload: {
    uid: string;
    title: string;
    startTime: string;
    endTime: string;
    attendees: Array<{
      name: string;
      email: string;
    }>;
  };
}
