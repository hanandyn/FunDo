// Lazy wrapper — self-contained page
// EnhancedScheduler is tightly coupled; this placeholder wraps it for standalone routing
import { useState } from 'react';
import { EnhancedScheduler } from '../components/parent/EnhancedScheduler';

export default function EnhancedSchedulerPage() {
  const [scheduleType, setScheduleType] = useState('daily');
  const [scheduleDays, setScheduleDays] = useState<number[]>([0,1,2,3,4]);
  const [scheduleEveryNDays, setScheduleEveryNDays] = useState<number>(1);
  const [scheduleMonthlyDay, setScheduleMonthlyDay] = useState<number>(1);

  return (
    <EnhancedScheduler
      templateId={null}
      scheduleType={scheduleType}
      scheduleDays={scheduleDays}
      scheduleEveryNDays={scheduleEveryNDays}
      scheduleMonthlyDay={scheduleMonthlyDay}
      onScheduleTypeChange={setScheduleType}
      onScheduleDaysChange={setScheduleDays}
      onEveryNDaysChange={setScheduleEveryNDays}
      onMonthlyDayChange={setScheduleMonthlyDay}
      onNthWeekdayChange={() => {}}
    />
  );
}
