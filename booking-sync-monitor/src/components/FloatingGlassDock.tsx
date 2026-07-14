'use client';

import { Bell, CheckCircle, ExternalLink } from 'lucide-react';
import GlassButton from './GlassButton';

interface FloatingGlassDockProps {
  onAcknowledge?: () => void;
  onMarkSynced?: () => void;
  onOpenFluentify?: () => void;
  status: 'pending' | 'acknowledged' | 'synced';
  showFluentify?: boolean;
}

export default function FloatingGlassDock({
  onAcknowledge,
  onMarkSynced,
  onOpenFluentify,
  status,
  showFluentify = false,
}: FloatingGlassDockProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {status === 'pending' && (
        <>
          {showFluentify && (
            <a
              href="https://www.fluentify.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <GlassButton
                variant="secondary"
                size="lg"
                onClick={onOpenFluentify}
                className="flex items-center gap-2 shadow-glow hover:shadow-glow-lg"
              >
                <ExternalLink className="w-5 h-5" />
                Open Fluentify
              </GlassButton>
            </a>
          )}
          
          <GlassButton
            variant="primary"
            size="lg"
            onClick={onAcknowledge}
            className="flex items-center gap-2 shadow-glow hover:shadow-glow-lg animate-pulse"
          >
            <Bell className="w-5 h-5" />
            Acknowledge
          </GlassButton>
        </>
      )}
      
      {status === 'acknowledged' && (
        <GlassButton
          variant="secondary"
          size="lg"
          onClick={onMarkSynced}
          className="flex items-center gap-2 shadow-glow hover:shadow-glow-lg"
        >
          <CheckCircle className="w-5 h-5" />
          Mark Synced
        </GlassButton>
      )}
    </div>
  );
}
