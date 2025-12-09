// /home/sanket/fnext-crm/apps/next_crm/frontend/src/utils/date.js

/**
 * Convert various inputs into a valid Date instance.
 * @param {Date|string|number|null|undefined} input
 * @returns {Date|null}
 */
export function toDate(input) {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input
  }

  if (input === null || input === undefined || input === '') {
    return null
  }

  const d = new Date(input)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Format a date using Intl.DateTimeFormat.
 *
 * @param {Date|string|number} input
 * @param {Intl.DateTimeFormatOptions} [options]
 * @param {string|string[]} [locale] - optional locale(s)
 * @returns {string}
 */
export function formatDate(
  input,
  options = { dateStyle: 'medium', timeStyle: 'short' },
  locale,
) {
  const d = toDate(input)
  if (!d) return ''

  try {
    return new Intl.DateTimeFormat(locale || undefined, options).format(d)
  } catch (e) {
    // In case of bad options/locale, fail gracefully
    return d.toLocaleString()
  }
}

/**
 * Human "time ago" using Intl.RelativeTimeFormat.
 *
 * Examples:
 *   timeAgo(new Date(Date.now() - 5 * 60 * 1000)) -> "5 minutes ago"
 *   timeAgo(new Date(Date.now() + 3600 * 1000))   -> "in 1 hour"
 *
 * @param {Date|string|number} input
 * @param {Date} [now=new Date()]
 * @param {string|string[]} [locale]
 * @param {Intl.RelativeTimeFormatOptions} [rtfOptions]
 * @returns {string}
 */
export function timeAgo(
  input,
  now = new Date(),
  locale,
  rtfOptions = { numeric: 'auto' },
) {
  const d = toDate(input)
  const baseNow = toDate(now)

  if (!d || !baseNow) return ''

  const diffMs = d.getTime() - baseNow.getTime() // negative for past
  const diffSec = Math.round(diffMs / 1000)
  const absSec = Math.abs(diffSec)

  // Very recent events: show a friendlier "just now"
  if (absSec < 5) {
    // Use locale if available; otherwise simple English string
    try {
      const rtf = new Intl.RelativeTimeFormat(locale || undefined, {
        numeric: 'auto',
        style: 'long',
      })
      return rtf.format(0, 'second')
    } catch (e) {
      return 'just now'
    }
  }

  const units = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ]

  let rtf
  try {
    rtf = new Intl.RelativeTimeFormat(locale || undefined, rtfOptions)
  } catch (e) {
    // Fallback if Intl.RelativeTimeFormat is not supported
    // or options are invalid
    return formatDate(input)
  }

  for (const [unit, secInUnit] of units) {
    if (absSec >= secInUnit || unit === 'second') {
      // Correct math: diffSec is in *seconds*, secInUnit is in *seconds*
      const value = Math.round(diffSec / secInUnit)
      return rtf.format(value, unit)
    }
  }

  return ''
}
