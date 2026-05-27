export interface TZ {
  /** Display label */
  label: string;
  /** IANA zone id, or 'local' for the user's machine zone */
  iana: string;
}

export const TIMEZONES: TZ[] = [
  { label: 'Local', iana: 'local' },
  { label: 'UTC', iana: 'UTC' },
  { label: 'Los Angeles', iana: 'America/Los_Angeles' },
  { label: 'Denver', iana: 'America/Denver' },
  { label: 'Chicago', iana: 'America/Chicago' },
  { label: 'New York', iana: 'America/New_York' },
  { label: 'São Paulo', iana: 'America/Sao_Paulo' },
  { label: 'London', iana: 'Europe/London' },
  { label: 'Paris', iana: 'Europe/Paris' },
  { label: 'Berlin', iana: 'Europe/Berlin' },
  { label: 'Athens', iana: 'Europe/Athens' },
  { label: 'Cairo', iana: 'Africa/Cairo' },
  { label: 'Johannesburg', iana: 'Africa/Johannesburg' },
  { label: 'Dubai', iana: 'Asia/Dubai' },
  { label: 'India (IST)', iana: 'Asia/Kolkata' },
  { label: 'Bangkok', iana: 'Asia/Bangkok' },
  { label: 'Singapore', iana: 'Asia/Singapore' },
  { label: 'Hong Kong', iana: 'Asia/Hong_Kong' },
  { label: 'Shanghai', iana: 'Asia/Shanghai' },
  { label: 'Tokyo', iana: 'Asia/Tokyo' },
  { label: 'Seoul', iana: 'Asia/Seoul' },
  { label: 'Sydney', iana: 'Australia/Sydney' },
  { label: 'Auckland', iana: 'Pacific/Auckland' },
];

export interface ZonedTime {
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
  offsetMinutes: number; // signed minutes east of UTC
}

/**
 * Resolve the hours/minutes/seconds and UTC offset for a given Date in a given IANA zone.
 * Uses Intl.DateTimeFormat for correctness (DST, half-hour zones, etc).
 */
export function getZonedTime(date: Date, iana: string): ZonedTime {
  const zone = iana === 'local' ? undefined : iana;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);

    for (const p of parts) {
      if (p.type === 'hour') hours = parseInt(p.value, 10) % 24;
      else if (p.type === 'minute') minutes = parseInt(p.value, 10);
      else if (p.type === 'second') seconds = parseInt(p.value, 10);
    }
  } catch {
    hours = date.getHours();
    minutes = date.getMinutes();
    seconds = date.getSeconds();
  }

  const ms = date.getMilliseconds();
  const offsetMinutes = getOffsetMinutes(date, zone);
  return { hours, minutes, seconds, ms, offsetMinutes };
}

function getOffsetMinutes(date: Date, zone?: string): number {
  if (!zone) return -date.getTimezoneOffset();
  try {
    // Format the date as the "wall time" in that zone, then re-parse as if it were UTC.
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const p of parts) map[p.type] = p.value;
    const asUTC = Date.UTC(
      parseInt(map.year, 10),
      parseInt(map.month, 10) - 1,
      parseInt(map.day, 10),
      parseInt(map.hour, 10) % 24,
      parseInt(map.minute, 10),
      parseInt(map.second, 10),
    );
    return Math.round((asUTC - date.getTime()) / 60000);
  } catch {
    return -date.getTimezoneOffset();
  }
}

export function formatOffset(min: number): string {
  if (min === 0) return 'UTC+0';
  const sign = min >= 0 ? '+' : '-';
  const m = Math.abs(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(r).padStart(2, '0')}`;
}
