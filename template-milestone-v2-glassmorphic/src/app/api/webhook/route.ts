import { NextRequest, NextResponse } from 'next/server';
import { addBooking } from '@/lib/storage';
import { CalWebhookPayload } from '@/lib/types';
import { securityHeaders, validateBooking, checkRateLimit } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const ip = request.ip || 'unknown';
    if (!checkRateLimit(ip, 30, 60000)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: securityHeaders }
      );
    }

    const payload: CalWebhookPayload = await request.json();
    
    console.log('Webhook received:', payload.triggerEvent);
    
    if (payload.triggerEvent === 'BOOKING_CREATED') {
      const validation = validateBooking(payload.payload);
      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 400, headers: securityHeaders }
        );
      }
      
      const booking = {
        id: payload.payload.uid,
        title: payload.payload.title,
        startTime: payload.payload.startTime,
        endTime: payload.payload.endTime,
        attendeeName: payload.payload.attendees[0]?.name || 'Unknown',
        attendeeEmail: payload.payload.attendees[0]?.email || 'Unknown',
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
      
      addBooking(booking);
      
      return NextResponse.json(
        { success: true, message: 'Booking recorded', bookingId: booking.id },
        { headers: securityHeaders }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Event processed' },
      { headers: securityHeaders }
    );
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid payload' },
      { status: 400, headers: securityHeaders }
    );
  }
}
