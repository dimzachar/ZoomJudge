import { cn } from '@/lib/utils'
import { SVGProps } from 'react';
import Image from 'next/image';

// ZoomJudge Logo Components
export function ZoomJudgeIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <Image
      src="/icon.svg"
      alt="ZoomJudge"
      width={32}
      height={32}
      priority
      className={cn("w-8 h-8", className)}
    />
  );
}

export function ZoomJudgeLogo({ className, variant = 'full', size = 'md' }: {
  className?: string;
  variant?: 'full' | 'icon' | 'text';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12'
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
