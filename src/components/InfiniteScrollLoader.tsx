import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, ChevronDown, CheckCircle2 } from "lucide-react";

export interface UseInfinitePaginationOptions {
  pageSize?: number;
  initialPageSize?: number;
  loadDelayMs?: number;
}

/**
 * Reusable hook that slices an array of items for client-side pagination
 * and triggers smooth infinite loading as the user scrolls to the bottom sentinel.
 */
export function useInfinitePagination<T>(
  items: T[],
  options: UseInfinitePaginationOptions = {},
  dependencies: any[] = []
) {
  const pageSize = options.pageSize || 8;
  const initialPageSize = options.initialPageSize || pageSize;
  const loadDelayMs = options.loadDelayMs ?? 400;

  const [visibleCount, setVisibleCount] = useState<number>(initialPageSize);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<any>(null);

  // Reset pagination when dependencies change (e.g., category, search, filter)
  useEffect(() => {
    setVisibleCount(initialPageSize);
    setIsLoadingMore(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [items.length, initialPageSize, ...dependencies]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);

    timeoutRef.current = setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
      setIsLoadingMore(false);
      timeoutRef.current = null;
    }, loadDelayMs);
  }, [hasMore, isLoadingMore, items.length, pageSize, loadDelayMs]);

  // Attach IntersectionObserver to sentinel element
  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "300px", // Pre-fetch before user hits the very bottom for butter-smooth scrolling
        threshold: 0.1
      }
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, loadMore]);

  const displayedItems = items.slice(0, visibleCount);

  return {
    displayedItems,
    visibleCount,
    hasMore,
    isLoadingMore,
    loadMore,
    sentinelRef,
    totalCount: items.length,
    displayedCount: displayedItems.length,
    reset: () => setVisibleCount(initialPageSize)
  };
}

export interface InfiniteScrollLoaderProps {
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore?: () => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  totalCount: number;
  displayedCount: number;
  itemLabel?: string;
  className?: string;
  showFinishedBadge?: boolean;
}

/**
 * Visual Scroll Down & Load More Component with smooth animations
 */
export const InfiniteScrollLoader: React.FC<InfiniteScrollLoaderProps> = ({
  hasMore,
  isLoadingMore,
  onLoadMore,
  sentinelRef,
  totalCount,
  displayedCount,
  itemLabel = "items",
  className = "",
  showFinishedBadge = true
}) => {
  if (totalCount === 0) {
    return null;
  }

  return (
    <div className={`w-full py-4 flex flex-col items-center justify-center select-none ${className}`}>
      {/* Invisible anchor monitored by IntersectionObserver */}
      <div ref={sentinelRef} className="h-2 w-full opacity-0 pointer-events-none" />

      <AnimatePresence mode="wait">
        {isLoadingMore ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200/80 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
          >
            {/* Spinning Indicator */}
            <div className="relative w-4 h-4 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-[#1E88E5] animate-spin" />
            </div>

            {/* Pulsing Dots Wave */}
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.18,
                    ease: "easeInOut"
                  }}
                  className="w-1.5 h-1.5 rounded-full bg-[#1E88E5]"
                />
              ))}
            </div>

            <span className="text-xs font-sans font-bold text-slate-700 tracking-tight">
              Loading more {itemLabel}...
            </span>
          </motion.div>
        ) : hasMore ? (
          <motion.div
            key="load-more-btn"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex flex-col items-center gap-2"
          >
            {onLoadMore && (
              <button
                type="button"
                onClick={onLoadMore}
                className="group flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100/90 text-slate-700 border border-slate-200/80 rounded-full text-xs font-sans font-bold transition-all shadow-xs hover:shadow-sm active:scale-97 cursor-pointer"
              >
                <span>Scroll down or click to load more</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:translate-y-0.5 transition-transform" />
              </button>
            )}
            <span className="text-[11px] font-mono text-slate-400 font-medium">
              Showing {displayedCount} of {totalCount} {itemLabel}
            </span>
          </motion.div>
        ) : showFinishedBadge && totalCount > 5 ? (
          <motion.div
            key="end-of-list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200/60 rounded-full text-slate-500"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-sans font-medium text-slate-600">
              All {totalCount} {itemLabel} loaded
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
