import { cn } from '@/lib/utils';

interface MarqueeProps {
  children: React.ReactNode;
  reverse?: boolean;
  className?: string;
}

export function Marquee({ children, reverse = false, className }: MarqueeProps) {
  return (
    <div className={cn('mask-fade-x overflow-hidden', className)}>
      <div
        className={cn(
          'flex w-max min-w-full gap-4 py-2 will-change-transform',
          reverse ? 'animate-marquee-reverse' : 'animate-marquee',
        )}
      >
        <div className="flex gap-4">{children}</div>
        <div className="flex gap-4" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
