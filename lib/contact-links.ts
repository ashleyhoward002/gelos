/**
 * Contact Deep Link Utilities
 * Generate URLs for contacting users via various platforms
 */

/**
 * Clean a phone number to digits only, optionally keeping the + prefix
 */
export function cleanPhoneNumber(number: string): string {
  // Keep only digits and leading +
  const hasPlus = number.startsWith('+');
  const digits = number.replace(/\D/g, '');
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Generate a WhatsApp deep link
 * @param number - Phone number (will be cleaned)
 * @param message - Optional pre-filled message
 */
export function whatsappLink(number: string, message?: string): string {
  const cleanNumber = number.replace(/\D/g, ''); // Remove all non-digits
  const base = `https://wa.me/${cleanNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Generate an Instagram profile link
 * @param handle - Instagram handle (with or without @)
 */
export function instagramLink(handle: string): string {
  const cleanHandle = handle.replace(/^@/, ''); // Remove @ if present
  return `https://instagram.com/${cleanHandle}`;
}

/**
 * Generate a Snapchat add friend link
 * @param handle - Snapchat username
 */
export function snapchatLink(handle: string): string {
  const cleanHandle = handle.replace(/^@/, ''); // Remove @ if present
  return `https://snapchat.com/add/${cleanHandle}`;
}

/**
 * Generate a phone call link
 * @param number - Phone number
 */
export function phoneCallLink(number: string): string {
  const cleanNumber = cleanPhoneNumber(number);
  return `tel:${cleanNumber}`;
}

/**
 * Generate an SMS link
 * @param number - Phone number
 * @param message - Optional pre-filled message
 */
export function smsLink(number: string, message?: string): string {
  const cleanNumber = cleanPhoneNumber(number);
  const base = `sms:${cleanNumber}`;
  return message ? `${base}?body=${encodeURIComponent(message)}` : base;
}

/**
 * Generate an email link
 * @param email - Email address
 * @param subject - Optional subject line
 * @param body - Optional email body
 */
export function emailLink(
  email: string,
  subject?: string,
  body?: string
): string {
  const params: string[] = [];
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);

  const base = `mailto:${email}`;
  return params.length > 0 ? `${base}?${params.join('&')}` : base;
}

/**
 * Contact info structure for a user
 */
export interface ContactInfo {
  phone?: string;
  whatsapp?: string;
  email?: string;
  instagram?: string;
  snapchat?: string;
}

/**
 * Check if a user has any contact info to display
 */
export function hasAnyContactInfo(contact: ContactInfo): boolean {
  return !!(
    contact.phone ||
    contact.whatsapp ||
    contact.email ||
    contact.instagram ||
    contact.snapchat
  );
}

/**
 * Count how many contact methods a user has shared
 */
export function countContactMethods(contact: ContactInfo): number {
  let count = 0;
  if (contact.phone) count++;
  if (contact.whatsapp) count++;
  if (contact.email) count++;
  if (contact.instagram) count++;
  if (contact.snapchat) count++;
  return count;
}

/**
 * Brand colors for each platform
 */
export const platformColors = {
  whatsapp: '#25D366',
  instagram: '#E4405F',
  snapchat: '#FFFC00',
  phone: 'var(--color-coral, #FF6B6B)',
  sms: 'var(--color-coral, #FF6B6B)',
  email: 'var(--color-coral, #FF6B6B)',
} as const;
