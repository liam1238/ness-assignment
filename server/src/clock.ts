export type Clock = {
  now(): Date;
};

export const systemClock: Clock = {
  now() {
    return new Date();
  },
};

export function createClock(now: Date): Clock {
  return {
    now: () => now,
  };
}

export function utcTodayString(clock: Clock): string {
  const d = clock.now();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}