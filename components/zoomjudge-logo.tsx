import { cn } from '@/lib/utils'

// ZoomJudge Logo Components
export function ZoomJudgeIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn("w-8 h-8 bg-contain bg-no-repeat bg-center", className)}
      style={{
        backgroundImage: 'url(/icon.svg)',
        width: '32px',
        height: '32px'
      }}
      role="img"
      aria-label="ZoomJudge"
    />
  )
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
