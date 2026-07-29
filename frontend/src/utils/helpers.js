// utils/helpers.js
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns';

/**
 * Format message timestamp for chat bubbles
 */
/**
 * Format message timestamp for chat bubbles (12-hour format with AM/PM)
 */
export const formatMessageTime = (date) => {
  return format(new Date(date), 'h:mm a');
};

/**
 * Format last seen / chat list timestamp (12-hour format with AM/PM)
 */
export const formatChatTime = (date) => {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEE');
  return format(d, 'dd/MM/yy');
};

/**
 * Format last seen status text
 */
export const formatLastSeen = (date, isOnline) => {
  if (isOnline) return 'Online';
  if (!date) return 'Offline';
  return `Last seen ${formatDistanceToNow(new Date(date), { addSuffix: true })}`;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Get initials from a display name
 */
export const getInitials = (name = '') => {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

/**
 * Get MIME type category
 */
export const getFileCategory = (mimetype = '') => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
};

/**
 * Generate a consistent color from a user ID or name (for avatars)
 */
export const stringToColor = (str = '') => {
  const colors = [
    '#7c3aed', '#db2777', '#0891b2', '#059669',
    '#d97706', '#dc2626', '#7c3aed', '#2563eb',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
