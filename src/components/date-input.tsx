"use client";

import { useRef, type InputHTMLAttributes } from "react";

// Shared everywhere a date needs picking, not just the dashboard — opens
// the browser's native calendar on a click anywhere in the field, not just
// its small icon, so nobody has to type mm/dd/yyyy by hand. showPicker()
// is broadly supported in current browsers; where it isn't, this still
// behaves as a normal <input type="date"> (clicking the icon still opens
// it) — nothing is lost, just less convenient on an old browser.
export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <input
      {...props}
      ref={ref}
      type="date"
      onClick={(e) => {
        try {
          ref.current?.showPicker();
        } catch {
          // Unsupported/blocked — falls back to default <input type="date"> behavior.
        }
        props.onClick?.(e);
      }}
    />
  );
}
