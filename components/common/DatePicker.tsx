'use client';

import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';

interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  error?: string;
  minDate?: string; // YYYY-MM-DD format
  maxDate?: string; // YYYY-MM-DD format
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
  label,
  error,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    onChange(dateString);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate) {
      const min = new Date(minDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
    if (maxDate) {
      const max = new Date(maxDate);
      max.setHours(23, 59, 59, 999);
      if (date > max) return true;
    }
    return false;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const displayValue = value ? format(new Date(value), 'MMM dd, yyyy') : '';

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'input-field flex items-center justify-between gap-2 text-left',
          error && 'ring-2 ring-error',
          !displayValue && 'text-muted'
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarIcon className="w-4 h-4 text-muted flex-shrink-0" />
          <span className={cn('truncate', !displayValue && 'text-muted')}>
            {displayValue || placeholder}
          </span>
        </div>
      </button>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}

      {isOpen && mounted && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] rounded-xl bg-white dark:bg-gray-800 border border-border shadow-lg overflow-hidden animate-scale-in"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${Math.max(menuPosition.width, 320)}px`,
          }}
        >
          {/* Calendar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-muted/10 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-semibold">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-muted/10 transition-colors"
              aria-label="Next month"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="p-4">
            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = value && isSameDay(day, new Date(value));
                const isTodayDate = isToday(day);
                const isDisabled = isDateDisabled(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => !isDisabled && handleSelect(day)}
                    disabled={isDisabled}
                    className={cn(
                      'aspect-square rounded-lg text-sm font-medium transition-all duration-150',
                      'hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
                      !isCurrentMonth && 'text-muted/50',
                      isCurrentMonth && !isSelected && !isTodayDate && 'hover:text-primary',
                      isTodayDate && !isSelected && 'bg-accent/10 text-accent font-semibold',
                      isSelected && 'bg-primary text-white hover:bg-primary-dark',
                      isDisabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Today Button */}
          <div className="p-3 border-t border-border">
            <button
              type="button"
              onClick={() => handleSelect(new Date())}
              className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

