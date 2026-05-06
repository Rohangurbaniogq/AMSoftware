"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";

interface SearchableDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = "Search...",
  label,
}: SearchableDropdownProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const touchStartY = useRef<number | null>(null);
  const inputId = useId();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filterOptions = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setFiltered(options.slice(0, 50));
      } else {
        const lower = q.toLowerCase();
        setFiltered(
          options.filter((o) => o.toLowerCase().includes(lower)).slice(0, 50)
        );
      }
      setHighlightIndex(-1);
    },
    [options]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    filterOptions(val);
  };

  const handleSelect = (option: string) => {
    setQuery(option);
    onChange(option);
    setIsOpen(false);
    // Blur input on mobile to dismiss keyboard
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Close dropdown when tapping/clicking outside
  useEffect(() => {
    const handleOutside = (e: Event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        if (!options.includes(query)) {
          setQuery(value);
        }
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [query, value, options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightIndex]);

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/50 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            filterOptions(query);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-10 bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground)]/30 text-sm transition-all duration-200"
        />
        {/* Clear / chevron icon */}
        {query && query !== value ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsOpen(true);
              filterOptions("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[var(--foreground)]/40 hover:text-[var(--foreground)]"
            aria-label="Clear"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        ) : (
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--foreground)]/30" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        )}
      </div>
      {isOpen && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-[var(--card-bg)] border border-[var(--grey-border)] rounded-xl shadow-lg max-h-52 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
          onTouchStart={(e) => {
            // Record touch start position to distinguish tap from scroll
            touchStartY.current = e.touches[0].clientY;
          }}
        >
          {filtered.map((option, i) => (
            <div
              key={option}
              role="option"
              aria-selected={option === value}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(option);
              }}
              onTouchEnd={(e) => {
                // Only select if this was a tap (not a scroll)
                if (touchStartY.current !== null) {
                  const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
                  if (dy < 10) {
                    e.preventDefault();
                    handleSelect(option);
                  }
                }
                touchStartY.current = null;
              }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors duration-100 first:rounded-t-xl last:rounded-b-xl cursor-pointer select-none ${
                i === highlightIndex
                  ? "bg-[var(--yellow)] text-black font-medium"
                  : option === value
                  ? "bg-[var(--yellow)]/10 text-[var(--foreground)] font-medium"
                  : "text-[var(--foreground)] active:bg-[var(--section-bg)]"
              }`}
            >
              {option}
            </div>
          ))}
        </div>
      )}
      {isOpen && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--card-bg)] border border-[var(--grey-border)] rounded-xl shadow-lg px-4 py-3">
          <p className="text-sm text-[var(--foreground)]/40 text-center">
            {options.length === 0 ? "Loading athletes..." : query.trim() ? "No athletes found" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
