'use client';
import { track } from '@vercel/analytics';

export default function StickySignupButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      onClick={() => track('sticky_signup_button_clicked')}
      className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-[#4A9FD5] text-white text-center py-3.5 rounded-2xl font-semibold text-[15px] shadow-lg shadow-black/25"
    >
      Sign up free — exclusive lunch specials
    </a>
  );
}
