import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Pill-shaped select matching Sites/Apps page dropdown style.
 * options: [{ value, label }]
 */
export default function PillSelect({
  value,
  onChange,
  options = [],
  prefix = "",
  className = "",
  placeholder = "Select...",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = options.find((o) => o.value === value);
  const display = selected
    ? (prefix ? `${prefix}${selected.label}` : selected.label)
    : placeholder;

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="appearance-none w-full min-w-[11rem] pl-4 pr-10 py-2 bg-slate-100 dark:bg-charcoal border border-slate-900/10 dark:border-white/10 text-xs font-extrabold text-slate-950 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-coral cursor-pointer shadow-sm text-left truncate"
      >
        {display}
      </button>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

      {open && (
        <div className="absolute z-40 mt-1.5 w-full min-w-[12rem] max-h-64 overflow-auto rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161722] shadow-lg py-1">
          {options.map((opt) => {
            const isActive = opt.value === value;
            const label = prefix ? `${prefix}${opt.label}` : opt.label;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-bold transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                {label}
              </button>
            );
          })}
          {options.length === 0 && (
            <p className="px-3.5 py-2 text-xs text-slate-400">No options</p>
          )}
        </div>
      )}
    </div>
  );
}
