'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  getYear,
  setYear,
  getMonth,
  setMonth,
  parse,
  isValid,
} from 'date-fns';
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
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const parsed = parse(value, 'yyyy-MM-dd', new Date());
      return isValid(parsed) ? parsed : new Date();
    }
    return new Date();
  });
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update current month when value changes
  useEffect(() => {
    if (value) {
      const parsed = parse(value, 'yyyy-MM-dd', new Date());
      if (isValid(parsed)) {
        setCurrentMonth(parsed);
      }
    }
  }, [value]);

  // Calculate and update menu position
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = Math.max(320, buttonRect.width);
    const menuHeight = showYearMonthPicker ? 420 : 380; // Approximate heights
    const gap = 8;
    const margin = 20;

    // Calculate horizontal position
    let left = buttonRect.left;
    if (left + menuWidth > viewportWidth - margin) {
      left = viewportWidth - menuWidth - margin;
    }
    if (left < margin) {
      left = margin;
    }

    // Calculate vertical position - prefer below, flip above if needed
    let top = buttonRect.bottom + gap;
    const spaceBelow = viewportHeight - buttonRect.bottom - gap;
    const spaceAbove = buttonRect.top - gap;

    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      // Show above button
      top = buttonRect.top - menuHeight - gap;
      if (top < margin) {
        top = margin;
      }
    } else {
      // Show below button
      if (top + menuHeight > viewportHeight - margin) {
        top = viewportHeight - menuHeight - margin;
      }
    }

    setPosition({ top, left, width: menuWidth });
  }, [showYearMonthPicker]);

  // Handle opening/closing date picker
  useEffect(() => {
    if (isOpen) {
      updatePosition();

      // Update position on scroll and resize
      const handleScroll = () => {
        updatePosition();
      };

      const handleResize = () => {
        updatePosition();
      };

      // Use capture phase to catch all scroll events
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setShowYearMonthPicker(false);
    };

    // Use capture phase to catch clicks early
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setShowYearMonthPicker(false);
    }
  };

  const handleSelect = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    onChange(dateString);
    setIsOpen(false);
    setShowYearMonthPicker(false);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleMonthYearClick = () => {
    setShowYearMonthPicker((prev) => !prev);
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
    setShowYearMonthPicker(false);
  };

  const handleMonthSelect = (month: number) => {
    setCurrentMonth(setMonth(currentMonth, month));
    setShowYearMonthPicker(false);
  };

  // Generate years for year picker (current year ± 50 years)
  const currentYear = getYear(new Date());
  const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

  // Generate months
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const isDateDisabled = (date: Date): boolean => {
    if (minDate) {
      const min = parse(minDate, 'yyyy-MM-dd', new Date());
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
    if (maxDate) {
      const max = parse(maxDate, 'yyyy-MM-dd', new Date());
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

  const displayValue = value
    ? format(parse(value, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')
    : '';

  if (!mounted) {
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label className="block text-sm font-medium mb-2">{label}</label>
        )}
        <button
          type="button"
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
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium mb-2">{label}</label>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          'input-field flex items-center justify-between gap-2 text-left',
          error && 'ring-2 ring-error',
          !displayValue && 'text-muted',
          isOpen && 'ring-2 ring-primary border-transparent'
        )}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CalendarIcon className="w-4 h-4 text-muted flex-shrink-0" />
          <span className={cn('truncate', !displayValue && 'text-muted')}>
            {displayValue || placeholder}
          </span>
        </div>
      </button>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl bg-white dark:bg-gray-800 border border-border shadow-lg overflow-hidden"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Date picker"
          >
            {/* Calendar Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={showYearMonthPicker}
                className="p-1.5 rounded-lg hover:bg-muted/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous month"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleMonthYearClick}
                className="px-3 py-1.5 rounded-lg hover:bg-muted/10 transition-colors text-sm font-semibold"
              >
                {format(currentMonth, 'MMMM yyyy')}
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={showYearMonthPicker}
                className="p-1.5 rounded-lg hover:bg-muted/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next month"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Year/Month Picker */}
            {showYearMonthPicker && (
              <div className="p-4 border-b border-border max-h-80 overflow-y-auto">
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted mb-2">Select Year</p>
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto scrollbar-thin">
                    {years.map((year) => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => handleYearSelect(year)}
                        className={cn(
                          'px-3 py-2 text-sm rounded-lg transition-colors',
                          getYear(currentMonth) === year
                            ? 'bg-primary text-white'
                            : 'hover:bg-muted/10'
                        )}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted mb-2">Select Month</p>
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((month, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleMonthSelect(index)}
                        className={cn(
                          'px-3 py-2 text-sm rounded-lg transition-colors',
                          getMonth(currentMonth) === index
                            ? 'bg-primary/20 text-primary font-semibold'
                            : 'hover:bg-muted/10'
                        )}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Grid */}
            {!showYearMonthPicker && (
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
                    const isSelected = value && isSameDay(day, parse(value, 'yyyy-MM-dd', new Date()));
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
                          isCurrentMonth &&
                            !isSelected &&
                            !isTodayDate &&
                            'hover:text-primary text-text-primary',
                          isTodayDate &&
                            !isSelected &&
                            'bg-accent/10 text-accent font-semibold',
                          isSelected && 'bg-primary text-white hover:bg-primary-dark',
                          isDisabled &&
                            'opacity-40 cursor-not-allowed hover:bg-transparent'
                        )}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Today Button */}
            {!showYearMonthPicker && (
              <div className="p-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleSelect(new Date())}
                  className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  Today
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
