'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from '@heroicons/react/24/outline';

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
  tooltip?: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  disabled = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = useState(false);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate and update menu position
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = buttonRect.width;
    const menuHeight = 240; // Approximate max height
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
      // Show above button - align bottom of menu with top of button
      top = buttonRect.top - menuHeight;
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
  }, []);

  // Handle opening/closing dropdown
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
    };

    // Use capture phase to catch clicks early
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  if (!mounted) {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          disabled={disabled}
          className={`input-field flex items-center justify-between gap-2 w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${
            disabled 
              ? 'opacity-60 cursor-not-allowed bg-muted/30' 
              : 'hover:border-primary/50'
          } ${buttonClassName}`}
        >
          <span className="text-sm font-medium truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDownIcon className="w-4 h-4 text-muted transition-transform duration-200 flex-shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`input-field flex items-center justify-between gap-2 w-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${
          disabled 
            ? 'opacity-60 cursor-not-allowed bg-muted/30' 
            : 'hover:border-primary/50'
        } ${
          isOpen ? 'ring-2 ring-primary border-transparent' : ''
        } ${buttonClassName}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <span className="text-sm font-medium truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-muted transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen &&
        createPortal(
        <>
            {/* Backdrop for mobile/accessibility */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
              aria-hidden="true"
          />

            {/* Dropdown Menu */}
          <div
            ref={menuRef}
            className="fixed z-[9999] rounded-xl bg-white dark:bg-gray-800 border border-border shadow-lg overflow-hidden"
            style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                width: `${position.width}px`,
            }}
              role="listbox"
          >
            <div className="py-1 max-h-60 overflow-y-auto scrollbar-thin">
                {options.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted text-center">
                    No options available
                  </div>
                ) : (
                  options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  disabled={option.disabled}
                  title={option.tooltip || (option.disabled ? `${option.label} is disabled` : undefined)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors duration-150 flex items-center justify-between gap-2 ${
                    option.disabled
                      ? 'opacity-50 cursor-not-allowed text-muted'
                      : value === option.value
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'hover:bg-muted/10'
                  }`}
                      role="option"
                      aria-selected={value === option.value}
                      aria-disabled={option.disabled}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
                  ))
                )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
