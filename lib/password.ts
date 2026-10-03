// Single source for the signup password rules, shown up front under the
// password field and enforced on submit.
export const PASSWORD_RULES = 'At least 8 characters, with an uppercase letter, a number, and a symbol (like ! or #).';

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter.';
  if (!/[0-9]/.test(pw)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Password must include at least one symbol (e.g. !@#$).';
  return null;
}

// Supabase's signup errors are terse ("User already registered"); reword the
// common one so diners know what to do next.
export function friendlySignupError(message: string): string {
  if (message.toLowerCase().includes('already')) return 'That email already has an account. Sign in instead.';
  return message;
}
