import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import type { ScheduleDay } from '../../lib/types';

interface EnhancedSchedulerProps {
  templateId: number | null;
  scheduleType: string;
  scheduleDays: number[] | null;
  scheduleEveryNDays: number | null;
  scheduleMonthlyDay: number | null;
  onScheduleTypeChange: (type: string) => void;
  onScheduleDaysChange: (days: number[]) => void;
  onEveryNDaysChange: (n: number) => void;
  onMonthlyDayChange: (d: number) => void;
  onNthWeekdayChange: (n: number, day: number) => void;
}

export function EnhancedScheduler({
  templateId,
  scheduleType,
  scheduleDays,
  scheduleEveryNDays,
  scheduleMonthlyDay,
  onScheduleTypeChange,
  onScheduleDaysChange,
  onEveryNDaysChange,
  onMonthlyDayChange,
  onNthWeekdayChange,
}: EnhancedSchedulerProps) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ScheduleDay[]>([]);
  const [nthN, setNthN] = useState(2);
  const [nthDay, setNthDay] = useState(1); // 0=Mon

  useEffect(() => {
    if (templateId) {
      api.schedulePreview(templateId)
        .then(p => setPreview(p as unknown as ScheduleDay[]))
        .catch(() => {});
    }
  }, [templateId, scheduleType, scheduleDays, scheduleEveryNDays, scheduleMonthlyDay]);

  const scheduleTypes = [
    { value: 'daily', label: t('task.daily') },
    { value: 'weekdays', label: t('task.weekdays') },
    { value: 'weekly', label: t('task.weekly') },
    { value: 'every_n_days', label: 'Every N Days' },
    { value: 'nth_weekday', label: 'Nth Weekday' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekdayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="space-y-4">
      {/* Schedule Type Selector */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">{t('task.schedule')}</label>
        <select
          value={scheduleType}
          onChange={e => onScheduleTypeChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
        >
          {scheduleTypes.map(st => (
            <option key={st.value} value={st.value}>{st.label}</option>
          ))}
        </select>
      </div>

      {/* Weekly day picker */}
      {scheduleType === 'weekly' && (
        <div>
          <label className="text-xs text-gray-500 block mb-2">Days of week</label>
          <div className="flex gap-1">
            {dayNames.map((name, idx) => (
              <button
                key={name}
                onClick={() => {
                  const days = scheduleDays || [];
                  const newDays = days.includes(idx)
                    ? days.filter(d => d !== idx)
                    : [...days, idx];
                  onScheduleDaysChange(newDays);
                }}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  (scheduleDays || []).includes(idx)
                    ? 'bg-quest-blue text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Every N days */}
      {scheduleType === 'every_n_days' && (
        <div>
          <label className="text-xs text-gray-500 block mb-1">Every X days</label>
          <input
            type="number"
            min={1}
            max={30}
            value={scheduleEveryNDays || 2}
            onChange={e => onEveryNDaysChange(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
          />
        </div>
      )}

      {/* Nth weekday */}
      {scheduleType === 'nth_weekday' && (
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Which occurrence</label>
            <select
              value={nthN}
              onChange={e => {
                const n = Number(e.target.value);
                setNthN(n);
                onNthWeekdayChange(n, nthDay);
              }}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
            >
              <option value={1}>1st</option>
              <option value={2}>2nd</option>
              <option value={3}>3rd</option>
              <option value={4}>4th</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Day of week</label>
            <select
              value={nthDay}
              onChange={e => {
                const d = Number(e.target.value);
                setNthDay(d);
                onNthWeekdayChange(nthN, d);
              }}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
            >
              {weekdayNames.map((name, idx) => (
                <option key={name} value={idx}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Monthly day */}
      {scheduleType === 'monthly' && (
        <div>
          <label className="text-xs text-gray-500 block mb-1">Day of month</label>
          <select
            value={scheduleMonthlyDay || 1}
            onChange={e => onMonthlyDayChange(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div>
          <label className="text-xs text-gray-500 block mb-2">Next 7 days preview</label>
          <div className="flex gap-1">
            {preview.map((day, idx) => (
              <div key={idx} className="flex-1 text-center">
                <div className="text-xs text-gray-400 mb-1">{day.day}</div>
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-sm ${
                    day.scheduled
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {day.scheduled ? '✓' : '·'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
