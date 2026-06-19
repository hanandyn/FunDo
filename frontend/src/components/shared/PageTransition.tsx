import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ErrorBoundary } from './ErrorBoundary';

interface PageTransitionProps {
  children: ReactNode;
  /** Unique key for AnimatePresence (usually route path) */
  pageKey?: string;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition: Record<string, unknown> = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.25,
};

/** Wraps page content with fade-in animation and error boundary */
export function PageTransition({ children, pageKey, className = '' }: PageTransitionProps) {
  return (
    <ErrorBoundary>
      <motion.div
        key={pageKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </ErrorBoundary>
  );
}
