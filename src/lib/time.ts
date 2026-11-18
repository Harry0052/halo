export function nowIso(now = new Date()) {
  return now.toISOString();
}

export function addMinutes(iso: string, minutes: number) {
  return new Date(Date.parse(iso) + minutes * 60 * 1000).toISOString();
}

export function addHours(iso: string, hours: number) {
  return new Date(Date.parse(iso) + hours * 60 * 60 * 1000).toISOString();
}

export function isPast(iso: string, now = new Date()) {
  return Date.parse(iso) <= now.getTime();
}

export function formatUtc(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);
  return `${formatted} UTC`;
}
