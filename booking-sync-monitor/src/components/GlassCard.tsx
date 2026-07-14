import { ReactNode, HTMLAttributes } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'alert' | 'success' | 'elevated';
}

export default function GlassCard({ children, className = '', variant = 'default', ...props }: GlassCardProps) {
  const variants = {
    default: 'bg-white/[0.02] border-white/[0.08]',
    alert: 'bg-red-500/[0.15] border-red-500/[0.3]',
    success: 'bg-green-500/[0.15] border-green-500/[0.3]',
    elevated: 'bg-white/[0.05] border-white/[0.1]',
  };

  return (
    <div
      className={`
        backdrop-blur-[20px]
        border
        rounded-xl
        shadow-glass
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
