"use client";

import { cn } from "@/lib/utils";
import { LazyAnimatePresence, LazyMotionDiv, OptimizedAnimation } from "@/components/optimized-animations";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import React, {
  ComponentPropsWithoutRef,
  useEffect,
  useMemo,
  useState,
} from "react";

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  const animations = {
    initial: shouldReduceMotion ? {} : { scale: 0, opacity: 0 },
    animate: shouldReduceMotion ? {} : { scale: 1, opacity: 1, originY: 0 },
    exit: shouldReduceMotion ? {} : { scale: 0, opacity: 0 },
    transition: shouldReduceMotion ? {} : { type: "spring" as const, stiffness: 350, damping: 40 },
  };

  if (shouldReduceMotion) {
    return <div className="mx-auto w-full">{children}</div>;
  }

  return (
    <LazyMotionDiv {...animations} layout className="mx-auto w-full">
      {children}
    </LazyMotionDiv>
  );
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  delay?: number;
}

export const AnimatedList = React.memo(
  ({ children, className, delay = 1000, ...props }: AnimatedListProps) => {
    const [index, setIndex] = useState(0);
    const shouldReduceMotion = useReducedMotion();
    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children],
    );

    useEffect(() => {
      if (shouldReduceMotion) {
        // Show all items immediately if motion is reduced
        setIndex(childrenArray.length - 1);
        return;
      }

      if (index < childrenArray.length - 1) {
        const timeout = setTimeout(() => {
          setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length);
        }, delay);

        return () => clearTimeout(timeout);
      }
    }, [index, delay, childrenArray.length, shouldReduceMotion]);

    const itemsToShow = useMemo(() => {
      const result = childrenArray.slice(0, index + 1).reverse();
      return result;
    }, [index, childrenArray]);

    return (
      <OptimizedAnimation
        className={cn(`flex flex-col items-center gap-4`, className)}
        fallback={
          <div className={cn(`flex flex-col items-center gap-4`, className)} {...props}>
            {childrenArray.map((item, idx) => (
              <div key={idx} className="mx-auto w-full">{item}</div>
            ))}
          </div>
        }
        {...props}
      >
        <LazyAnimatePresence>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key}>
              {item}
            </AnimatedListItem>
          ))}
        </LazyAnimatePresence>
      </OptimizedAnimation>
    );
  },
);

AnimatedList.displayName = "AnimatedList";
