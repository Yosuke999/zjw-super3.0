import type { TrendPoint } from "./contracts.ts";

const shanghaiOffsetMilliseconds = 8 * 60 * 60 * 1000;

export function shanghaiDate(value: Date | string | number) {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() + shanghaiOffsetMilliseconds).toISOString().slice(0, 10);
}

export function periodStart(days: number, now = new Date()) {
  const businessNow = new Date(now.getTime() + shanghaiOffsetMilliseconds);
  return new Date(Date.UTC(
    businessNow.getUTCFullYear(),
    businessNow.getUTCMonth(),
    businessNow.getUTCDate() - (days - 1),
  ) - shanghaiOffsetMilliseconds);
}

export function emptyBusinessDates(days: number, now = new Date()): TrendPoint[] {
  const today = shanghaiDate(now);
  const [year, month, day] = today.split("-").map(Number);
  const output: TrendPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1, day - offset));
    output.push({ date: date.toISOString().slice(0, 10), pageViews: 0, visitors: 0, inquiries: 0 });
  }
  return output;
}
