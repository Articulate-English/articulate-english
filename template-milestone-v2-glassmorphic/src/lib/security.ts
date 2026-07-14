import { ReactNode, ButtonHTMLAttributes } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export default function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: GlassButtonProps) {
  const variants = {
    primary: 'bg-accent-violet/20 hover:bg-accent-violet/30 text-primary-text border-accent-violet/30 hover:shadow-glow-lg',
    secondary: 'bg-white/[0.05] hover:bg-white/[0.08] text-secondary-text border-white/[0.1]',
    ghost: 'bg-transparent hover:bg-white/[0.05] text-tertiary-text border-transparent',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-500/30',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`
        backdrop-blur-[20px]
        border
        rounded-lg
        font-medium
        transition-all
        duration-200
        hover:-translate-y-0.5
        active:translate-y-0
        shadow-glass
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
