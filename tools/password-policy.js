// Match Supabase's uppercase, lowercase, digits and symbols password policy.
export const PASSWORD_HINT = 'Use at least 8 characters, including an uppercase letter, a lowercase letter, a number and a special character.';
const symbols = "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~";
export function passwordRules(value) {
  return {
    length: [...value].length >= 8,
    uppercase: /[A-Z]/.test(value),
    lowercase: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    special: [...value].some(character => symbols.includes(character))
  };
}
export function passwordError(value) {
  if ([...value].length > 128) return 'Use no more than 128 characters.';
  return Object.values(passwordRules(value)).every(Boolean) ? '' : PASSWORD_HINT;
}
