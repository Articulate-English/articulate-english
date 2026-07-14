'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle, Clock, Bell, BellOff, Calendar } from 'lucide-react';
import CodeRain from '@/components/CodeRain';
import GlassCard from '@/components/GlassCard';
import GlassButton from '@/components/GlassButton';
import FloatingGlassDock from '@/components/FloatingGlassDock';
import { Booking } from '@/lib/types';
import { addBooking, updateBookingStatus, deleteBooking, getBookings } from '@/lib/storage';

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hasPending, setHasPending] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [audioStarted, setAudioStarted] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio
  const initAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/alarm.mp3');
      audioRef.current.loop = false;
    }
  }, []);

  // Play alarm
  const playAlarm = useCallback(() => {
    if (!audioRef.current || !soundEnabled) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
    setAudioStarted(true);
  }, [soundEnabled]);

  // 30-minute alarm repeat
  useEffect(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
    }
    
    if (hasPending && soundEnabled && audioRef.current) {
      if (!audioStarted) {
        playAlarm();
      }
      
      alarmIntervalRef.current = setInterval(() => {
        playAlarm();
      }, 30 * 60 * 1000); // 30 minutes
    }
    
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
    };
  }, [hasPending, soundEnabled, playAlarm, audioStarted]);

  // Poll for updates
  useEffect(() => {
    const poll = () => {
      const current = getBookings();
      setBookings(current);
      setHasPending(current.some(b => b.status !== 'synced'));
    };
    
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  // Booking actions
  const acknowledgeBooking = (id: string) => {
    updateBookingStatus(id, 'acknowledged');
    const current = getBookings();
    setBookings(current);
    setHasPending(current.some(b => b.status !== 'synced'));
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const markSynced = (id: string) => {
    updateBookingStatus(id, 'synced');
    const current = getBookings();
    setBookings(current);
    setHasPending(current.some(b => b.status !== 'synced'));
    setSelectedBooking(null);
  };

  const handleDelete = (id: string) => {
    deleteBooking(id);
    const current = getBookings();
    setBookings(current);
    setHasPending(current.some(b => b.status !== 'synced'));
    setSelectedBooking(null);
  };

  const addTestBooking = () => {
    initAudio();
    const booking: Booking = {
      id: 'test-' + Date.now(),
      title: 'Test Booking',
      startTime: new Date(Date.now() + 3600000).toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
      attendeeName: 'Test Student',
      attendeeEmail: 'test@example.com',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    addBooking(booking);
    const current = getBookings();
    setBookings(current);
    setHasPending(true);
    setAudioStarted(false);
    setSelectedBooking(booking);
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const acknowledgedCount = bookings.filter(b => b.status === 'acknowledged').length;
  const syncedCount = bookings.filter(b => b.status === 'synced').length;

  const selectedStatus = selectedBooking?.status || 'pending';

  return (
    <>
      <CodeRain />
      
      <div className="min-h-screen relative z-10">
        {/* Alert Banner */}
        {hasPending && (
          <div className="fixed top-0 left-0 right-0 z-50 glass-alert animate-pulse">
            <div className="flex items-center justify-center py-4 px-4">
              <AlertTriangle className="w-6 h-6 mr-3 text-red-200" />
              <span className="font-bold text-lg text-red-100 glow-text">
                {pendingCount > 0 
                  ? `⚠️ ${pendingCount} BOOKING${pendingCount > 1 ? 'S' : ''} NEED SYNC`
                  : `${acknowledgedCount} acknowledged - awaiting sync`}
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <header className={`glass border-b border-white/[0.08] ${hasPending ? 'mt-16' : ''}`}>
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-primary-text glow-text">Booking Sync Monitor</h1>
                <p className="text-secondary-text mt-1">Glassmorphic booking monitor • Alarm every 30min</p>
              </div>
              
              <div className="flex items-center gap-4">
                <GlassButton
                  variant="ghost"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                >
                  {soundEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                  {soundEnabled ? 'Sound On' : 'Muted'}
                </GlassButton>
                
                <GlassButton variant="primary" onClick={addTestBooking}>
                  + Test Booking
                </GlassButton>
              </div>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <GlassCard className="p-4 glow-border">
                <div className="text-3xl font-bold text-red-400">{pendingCount}</div>
                <div className="text-sm text-tertiary-text">Pending Sync</div>
              </GlassCard>
              
              <GlassCard className="p-4">
                <div className="text-3xl font-bold text-yellow-400">{acknowledgedCount}</div>
                <div className="text-sm text-tertiary-text">Acknowledged</div>
              </GlassCard>
              
              <GlassCard className="p-4">
                <div className="text-3xl font-bold text-green-400">{syncedCount}</div>
                <div className="text-sm text-tertiary-text">Synced</div>
              </GlassCard>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 pb-32">
          {bookings.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-16 h-16 mx-auto text-tertiary-text mb-4" />
              <p className="text-xl text-secondary-text">No bookings yet</p>
              <p className="text-tertiary-text mt-2">Click "Test Booking" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <GlassCard
                  key={booking.id}
                  variant={booking.status === 'pending' ? 'alert' : booking.status === 'acknowledged' ? 'elevated' : 'default'}
                  className={`p-6 cursor-pointer transition-all hover:scale-[1.01] ${
                    selectedBooking?.id === booking.id ? 'ring-2 ring-accent-violet' : ''
                  }`}
                  onClick={() => setSelectedBooking(booking)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          booking.status === 'pending' ? 'bg-red-500' :
                          booking.status === 'acknowledged' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} />
                        <span className="text-lg font-semibold text-primary-text">{booking.title}</span>
                        
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'pending' ? 'bg-red-500/20 text-red-300' :
                          booking.status === 'acknowledged' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {booking.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="text-secondary-text mb-1">
                        <Clock className="w-4 h-4 inline mr-2" />
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </div>
                      
                      <div className="text-tertiary-text text-sm">
                        {booking.attendeeName} ({booking.attendeeEmail})
                      </div>
                    </div>
                    
                    {selectedBooking?.id === booking.id && booking.status === 'pending' && (
                      <div className="flex flex-col gap-2 ml-4">
                        <GlassButton
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeBooking(booking.id);
                          }}
                        >
                          <Bell className="w-4 h-4 mr-2" />
                          Acknowledge
                        </GlassButton>
                      </div>
                    )}
                  </div>
                  
                  {booking.status === 'pending' && selectedBooking?.id === booking.id && (
                    <div className="mt-4 p-4 bg-white/[0.02] rounded-lg text-sm text-secondary-text">
                      <strong className="text-primary-text">Action Required:</strong>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Click "Acknowledge" to stop alarm</li>
                        <li>Open Fluentify and block time slot</li>
                        <li>Verify Google Calendar has event</li>
                        <li>Mark as synced when done</li>
                      </ol>
                      <p className="mt-2 text-accent-violet">⏰ Alarm repeats every 30 minutes</p>
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </main>

        {/* Floating Glass Dock */}
        {selectedBooking && (
          <FloatingGlassDock
            status={selectedStatus}
            onAcknowledge={() => acknowledgeBooking(selectedBooking.id)}
            onMarkSynced={() => markSynced(selectedBooking.id)}
            showFluentify={selectedStatus === 'pending'}
          />
        )}
      </div>
    </>
  );
}
