import { cn } from '@/lib/utils'
import { SVGProps } from 'react';

// ZoomJudge Logo Components
export function ZoomJudgeIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={cn("w-6 h-6", className)}
      fill="none"
      {...props}
    >
      {/* Code brackets */}
      <path
        d="M8 6L4 10V14L8 18M24 6L28 10V14L24 18"
        stroke="url(#zoomjudge-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Judge's gavel */}
      <path
        d="M12 20L20 12M16 16L18 14L20 16L18 18L16 16Z"
        stroke="url(#zoomjudge-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Gavel base */}
      <path
        d="M10 22H22"
        stroke="url(#zoomjudge-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id="zoomjudge-gradient"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#9333ea" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function ZoomJudgeLogo({ className, variant = 'full', size = 'md' }: {
  className?: string;
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  if (variant === 'icon') {
    return <ZoomJudgeIcon className={cn(sizeClasses[size], className)} />;
  }

  if (variant === 'text') {
    return (
      <span className={cn('font-bold text-foreground', textSizeClasses[size], className)}>
        ZoomJudge
      </span>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ZoomJudgeIcon className={sizeClasses[size]} />
      <span className={cn('font-bold text-foreground', textSizeClasses[size])}>
        ZoomJudge
      </span>
    </div>
  );
}
