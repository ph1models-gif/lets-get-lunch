'use client';
import { useEffect, useRef } from 'react';

// Red error box that scrolls itself into view when it appears, so a failed
// tap on a long form never looks like nothing happened.
export default function FormError({ message, className = '' }: { message: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [message]);
  if (!message) return null;
  return <p ref={ref} role="alert" className={`text-red-500 text-sm bg-red-50 px-4 py-3 rounded-xl ${className}`}>{message}</p>;
}
