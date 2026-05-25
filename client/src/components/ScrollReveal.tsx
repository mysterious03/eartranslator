import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // Delay in milliseconds
  duration?: number; // Duration in milliseconds
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  threshold?: number; // Intersection threshold (0 to 1)
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  duration = 800,
  direction = 'up',
  threshold = 0.1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Unobserve after showing so we don't repeat the animation
          if (containerRef.current) {
            observer.unobserve(containerRef.current);
          }
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px', // Animates slightly before entering view
      }
    );

    const currentRef = containerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [threshold]);

  // Set translation direction styles
  const getDirectionStyle = () => {
    switch (direction) {
      case 'up':
        return 'translate-y-8';
      case 'down':
        return '-translate-y-8';
      case 'left':
        return 'translate-x-8';
      case 'right':
        return '-translate-x-8';
      case 'none':
      default:
        return '';
    }
  };

  return (
    <div
      ref={containerRef}
      className={`transition-all cubic-bezier(0.16, 1, 0.3, 1) ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? 'none'
          : direction !== 'none'
          ? direction === 'up' || direction === 'down'
            ? `translateY(${direction === 'up' ? '24px' : '-24px'})`
            : `translateX(${direction === 'left' ? '24px' : '-24px'})`
          : 'none',
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};
export default ScrollReveal;
