import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FilterOption {
  key: string;
  label: string;
  type: 'select' | 'toggle' | 'range';
  options?: { value: string; label: string }[];
  /** For range: min/max values */
  min?: number;
  max?: number;
  /** For toggle: on/off state */
  enabled?: boolean;
}

export interface FilterState {
  [key: string]: string | boolean | [number, number] | undefined;
}

interface FilterPanelProps {
  options: FilterOption[];
  values: FilterState;
  onChange: (values: FilterState) => void;
  onReset: () => void;
  className?: string;
  /** Title for the filter section */
  title?: string;
}

/** Collapsible filter sidebar/panel */
export function FilterPanel({
  options,
  values,
  onChange,
  onReset,
  className = '',
  title = 'Filters',
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveFilters = Object.values(values).some(v => v !== undefined && v !== '' && v !== false);

  const handleChange = (key: string, value: string | boolean | [number, number]) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors focus-ring"
        aria-expanded={expanded}
        aria-controls="filter-panel-content"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⚙️</span>
          <span className="font-bold text-sm text-gray-700">{title}</span>
          {hasActiveFilters && (
            <span className="bg-quest-blue text-white text-xs rounded-full px-2 py-0.5">
              Active
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-gray-400"
        >
          ▼
        </motion.span>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            id="filter-panel-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-3 border-t border-gray-100">
              {options.map(option => (
                <div key={option.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {option.label}
                  </label>

                  {option.type === 'select' && option.options && (
                    <select
                      value={(values[option.key] as string) || ''}
                      onChange={e => handleChange(option.key, e.target.value)}
                      className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:border-quest-blue focus:ring-1 focus:ring-quest-blue/30 outline-none"
                      aria-label={`Filter by ${option.label}`}
                    >
                      <option value="">All</option>
                      {option.options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {option.type === 'toggle' && (
                    <button
                      onClick={() => handleChange(option.key, !values[option.key])}
                      className={`w-full p-2 text-sm rounded-lg border transition-all text-left ${
                        values[option.key]
                          ? 'bg-quest-blue/10 border-quest-blue text-quest-blue font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                      aria-pressed={(values[option.key] as boolean) || false}
                    >
                      {option.label} {(values[option.key] as boolean) ? '✅' : '☐'}
                    </button>
                  )}

                  {option.type === 'range' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={option.min || 0}
                        max={option.max || 100}
                        placeholder={`${option.min || 0}`}
                        value={(values[option.key] as [number, number])?.[0] ?? ''}
                        onChange={e => {
                          const current = (values[option.key] as [number, number]) || [0, option.max || 100];
                          handleChange(option.key, [Number(e.target.value), current[1]]);
                        }}
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:border-quest-blue focus:ring-1 focus:ring-quest-blue/30 outline-none"
                        aria-label={`${option.label} minimum`}
                      />
                      <span className="text-gray-400">–</span>
                      <input
                        type="number"
                        min={option.min || 0}
                        max={option.max || 100}
                        placeholder={`${option.max || 100}`}
                        value={(values[option.key] as [number, number])?.[1] ?? ''}
                        onChange={e => {
                          const current = (values[option.key] as [number, number]) || [0, option.max || 100];
                          handleChange(option.key, [current[0], Number(e.target.value)]);
                        }}
                        className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:border-quest-blue focus:ring-1 focus:ring-quest-blue/30 outline-none"
                        aria-label={`${option.label} maximum`}
                      />
                    </div>
                  )}
                </div>
              ))}

              {/* Reset button */}
              {hasActiveFilters && (
                <button
                  onClick={onReset}
                  className="w-full py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus-ring"
                >
                  Reset all filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
