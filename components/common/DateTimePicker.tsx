'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  setHours,
  setMinutes,
  getHours,
  getMinutes,
} from 'date-fns';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils/cn';

interface DateTimePickerProps {
  value?: string; // YYYY-MM-DDTHH:mm format (datetime-local)
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string | React.ReactNode;
  error?: string;
  minDateTime?: string; // YYYY-MM-DDTHH:mm format
  maxDateTime?: string; // YYYY-MM-DDTHH:mm format
  helperText?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Select date and time',
  className = '',
  label,
  error,
  minDateTime,
  maxDateTime,
  helperText,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState({ hours: 12, minutes: 0 });
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const parsed = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
      return isValid(parsed) ? parsed : new Date();
    }
    return new Date();
  });
  const [showYearMonthPicker, setShowYearMonthPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 400 });
  const [mounted, setMounted] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse value and set selected date/time
  useEffect(() => {
    if (value) {
      const parsed = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
      if (isValid(parsed)) {
        setSelectedDate(parsed);
        setSelectedTime({ hours: getHours(parsed), minutes: getMinutes(parsed) });
        setCurrentMonth(parsed);
      }
    } else {
      setSelectedDate(null);
      setSelectedTime({ hours: 12, minutes: 0 });
    }
  }, [value]);

  // Calculate and update menu position
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = Math.max(320, buttonRect.width);
    const gap = 8;
    const margin = 20;
    
    // Calculate available space
    const spaceBelow = viewportHeight - buttonRect.bottom - gap - margin;
    const spaceAbove = buttonRect.top - gap - margin;
    const maxAvailableSpace = Math.max(spaceBelow, spaceAbove);
    
    // Set max height based on available space, but cap at reasonable maximums
    const maxMenuHeight = Math.min(
      maxAvailableSpace,
      showYearMonthPicker ? 500 : showTimePicker ? 420 : 400
    );

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
    
    if (spaceBelow < maxMenuHeight && spaceAbove > spaceBelow) {
      // Show above button
      top = buttonRect.top - maxMenuHeight - gap;
      if (top < margin) {
        top = margin;
      }
    } else {
      // Show below button, but ensure it fits
      if (top + maxMenuHeight > viewportHeight - margin) {
        top = Math.max(margin, viewportHeight - maxMenuHeight - margin);
      }
    }

    setPosition({ top, left, width: menuWidth, maxHeight: maxMenuHeight });
  }, [showYearMonthPicker, showTimePicker]);

  // Handle opening/closing date picker
  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleScroll = () => {
        updatePosition();
      };

      const handleResize = () => {
        updatePosition();
      };

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
      setShowTimePicker(false);
    };

    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setShowYearMonthPicker(false);
      setShowTimePicker(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    const dateWithTime = setHours(setMinutes(date, selectedTime.minutes), selectedTime.hours);
    setSelectedDate(dateWithTime);
    setShowTimePicker(true);
  };

  const handleTimeChange = (hours: number, minutes: number) => {
    setSelectedTime({ hours, minutes });
    if (selectedDate) {
      const dateWithTime = setHours(setMinutes(selectedDate, minutes), hours);
      const dateTimeString = format(dateWithTime, "yyyy-MM-dd'T'HH:mm");
      onChange(dateTimeString);
    }
  };

  const handleConfirm = () => {
    if (selectedDate) {
      const dateWithTime = setHours(setMinutes(selectedDate, selectedTime.minutes), selectedTime.hours);
      const dateTimeString = format(dateWithTime, "yyyy-MM-dd'T'HH:mm");
      onChange(dateTimeString);
      setIsOpen(false);
      setShowTimePicker(false);
      setShowYearMonthPicker(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleMonthYearClick = () => {
    setShowYearMonthPicker((prev) => !prev);
    setShowTimePicker(false);
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
    setShowYearMonthPicker(false);
  };

  const handleMonthSelect = (month: number) => {
    setCurrentMonth(setMonth(currentMonth, month));
    setShowYearMonthPicker(false);
  };

  // Generate years for year picker
  const currentYear = getYear(new Date());
  const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

  // Generate months
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const isDateDisabled = (date: Date): boolean => {
    if (minDateTime) {
      const min = parse(minDateTime, "yyyy-MM-dd'T'HH:mm", new Date());
      if (date < min) return true;
    }
    if (maxDateTime) {
      const max = parse(maxDateTime, "yyyy-MM-dd'T'HH:mm", new Date());
      if (date > max) return true;
    }
    return false;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const displayValue = value
    ? format(parse(value, "yyyy-MM-dd'T'HH:mm", new Date()), 'MMM dd, yyyy HH:mm')
    : '';

  // Generate hours and minutes
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

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
            <ClockIcon className="w-4 h-4 text-muted flex-shrink-0" />
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
          <ClockIcon className="w-4 h-4 text-muted flex-shrink-0" />
          <span className={cn('truncate', !displayValue && 'text-muted')}>
            {displayValue || placeholder}
          </span>
        </div>
      </button>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
      {!error && helperText && (
        <p className="mt-1 text-xs text-muted">{helperText}</p>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl bg-white dark:bg-gray-800 border border-border shadow-lg overflow-hidden flex flex-col"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
              maxHeight: `${position.maxHeight}px`,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Date and time picker"
          >
            {/* Calendar Header */}
            {!showTimePicker && (
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
            )}

            {/* Year/Month Picker */}
            {showYearMonthPicker && !showTimePicker && (
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
            {!showYearMonthPicker && !showTimePicker && (
              <div className="p-4 overflow-y-auto flex-1">
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

                <div className="grid grid-cols-7 gap-1">
                  {days.map((day) => {
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isTodayDate = isToday(day);
                    const isDisabled = isDateDisabled(day);

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => !isDisabled && handleDateSelect(day)}
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

            {/* Time Picker */}
            {showTimePicker && (
              <div className="p-4 overflow-y-auto flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">Select Time</h3>
                  {selectedDate && (
                    <span className="text-xs text-muted">
                      {format(selectedDate, 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-4">
                  {/* Hours */}
                  <div className="flex flex-col items-center">
                    <label className="text-xs font-medium text-muted mb-2">Hours</label>
                    <div className="max-h-48 overflow-y-auto scrollbar-thin border border-border rounded-lg p-2">
                      {hours.map((hour) => (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => handleTimeChange(hour, selectedTime.minutes)}
                          className={cn(
                            'w-12 px-3 py-2 text-sm rounded-lg transition-colors mb-1',
                            selectedTime.hours === hour
                              ? 'bg-primary text-white'
                              : 'hover:bg-muted/10'
                          )}
                        >
                          {String(hour).padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Minutes */}
                  <div className="flex flex-col items-center">
                    <label className="text-xs font-medium text-muted mb-2">Minutes</label>
                    <div className="max-h-48 overflow-y-auto scrollbar-thin border border-border rounded-lg p-2">
                      {minutes.map((minute) => (
                        <button
                          key={minute}
                          type="button"
                          onClick={() => handleTimeChange(selectedTime.hours, minute)}
                          className={cn(
                            'w-12 px-3 py-2 text-sm rounded-lg transition-colors mb-1',
                            selectedTime.minutes === minute
                              ? 'bg-primary text-white'
                              : 'hover:bg-muted/10'
                          )}
                        >
                          {String(minute).padStart(2, '0')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            {!showYearMonthPicker && (
              <div className="p-3 border-t border-border flex items-center justify-between gap-2 flex-shrink-0">
                {!showTimePicker ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        handleDateSelect(today);
                      }}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        setShowTimePicker(false);
                      }}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-muted/10 text-muted hover:bg-muted/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTimePicker(false);
                      }}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-muted/10 text-muted hover:bg-muted/20 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={!selectedDate}
                      className="px-3 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirm
                    </button>
                  </>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

