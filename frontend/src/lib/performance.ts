/**
 * Performance monitoring utility for the frontend.
 *
 * Tracks:
 * - Page load time
 * - API response times (via intercepting fetch)
 * - Logs slow API calls (>1000ms) in development
 */

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  type: 'navigation' | 'api' | 'render';
}

class PerformanceMonitor {
  private entries: PerformanceEntry[] = [];
  private slowThresholdMs = 1000;
  private originalFetch: typeof fetch;

  constructor() {
    this.originalFetch = window.fetch.bind(window);
  }

  start() {
    this.measurePageLoad();
    this.interceptFetch();
  }

  private measurePageLoad() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.addEntry({
                name: 'page-load',
                startTime: navEntry.startTime,
                duration: navEntry.loadEventEnd - navEntry.startTime,
                type: 'navigation',
              });
            }
          }
        });
        observer.observe({ type: 'navigation', buffered: true });
      } catch { /* ignore on older browsers */ }
    }
  }

  private interceptFetch() {
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const start = performance.now();
      const url = typeof args[0] === 'string' ? args[0] :
        args[0] instanceof Request ? args[0].url : args[0].href;

      try {
        const response = await this.originalFetch(...args);
        const duration = Math.round(performance.now() - start);

        if (url.includes('/api/')) {
          this.addEntry({
            name: url,
            startTime: start,
            duration,
            type: 'api',
          });

          if (duration > this.slowThresholdMs) {
            if (import.meta.env.DEV) {
              console.warn(
                `⚠️  SLOW API: ${url} — ${duration}ms`,
                `(${((duration / 1000).toFixed(1))}s)`,
              );
            }
          }
        }

        return response;
      } catch (error) {
        const duration = Math.round(performance.now() - start);
        if (url.includes('/api/')) {
          console.error(`❌ API ERROR: ${url} — ${duration}ms`, error);
        }
        throw error;
      }
    };
  }

  private addEntry(entry: PerformanceEntry) {
    this.entries.push(entry);
    // Keep only last 50 entries
    if (this.entries.length > 50) {
      this.entries = this.entries.slice(-50);
    }
  }

  getEntries(): PerformanceEntry[] {
    return [...this.entries];
  }

  getApiStats() {
    const apiEntries = this.entries.filter((e) => e.type === 'api');
    if (apiEntries.length === 0) return null;

    const durations = apiEntries.map((e) => e.duration);
    durations.sort((a, b) => a - b);

    return {
      count: durations.length,
      avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: durations[0],
      max: durations[durations.length - 1],
      slowCount: apiEntries.filter((e) => e.duration > this.slowThresholdMs).length,
    };
  }
}

export const perfMonitor = new PerformanceMonitor();

/** Get page load time in ms */
export function getPageLoadTime(): number | null {
  if (typeof window === 'undefined') return null;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return null;
  return Math.round(nav.loadEventEnd - nav.startTime);
}

/** Start the performance monitor (call once in main.tsx) */
export function initPerformanceMonitor() {
  if (typeof window !== 'undefined') {
    perfMonitor.start();
  }
}
