import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AvailabilityCalendarProps {
  blockedDates: string[];           // 'YYYY-MM-DD' strings
  onToggleDate: (date: string) => void;
  readOnly?: boolean;
  highlightToday?: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function AvailabilityCalendar({
  blockedDates,
  onToggleDate,
  readOnly = false,
  highlightToday = true,
}: AvailabilityCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const blockedSet = new Set(blockedDates);
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (day: number) => {
    if (readOnly) return;
    const dateStr = toDateStr(viewYear, viewMonth, day);
    // Can't block past dates
    if (dateStr < todayStr) return;
    onToggleDate(dateStr);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 text-primary" />
        </button>
        <h3 className="font-semibold text-base">
          {MONTHS[viewMonth]} {viewYear}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
        >
          <ChevronRight className="h-4 w-4 text-primary" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;

          const dateStr = toDateStr(viewYear, viewMonth, day);
          const isBlocked = blockedSet.has(dateStr);
          const isToday = highlightToday && dateStr === todayStr;
          const isPast = dateStr < todayStr;

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(day)}
              disabled={readOnly || isPast}
              title={isBlocked ? 'Blocked — click to unblock' : isPast ? 'Past date' : 'Click to block'}
              className={`
                relative h-9 w-full rounded-lg text-sm font-medium transition-all
                ${isPast
                  ? 'text-gray-300 cursor-not-allowed'
                  : isBlocked
                  ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                  : isToday
                  ? 'bg-primary/20 text-primary border-2 border-primary hover:bg-red-100'
                  : 'hover:bg-red-100 hover:text-red-600 text-foreground'
                }
                ${readOnly && isBlocked ? 'cursor-default' : ''}
              `}
            >
              {day}
              {isBlocked && !isPast && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {!readOnly && (
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span>Blocked / Fully booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-white border-2 border-primary rounded" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 bg-white border border-gray-200 rounded" />
            <span>Available</span>
          </div>
        </div>
      )}
    </div>
  );
}
