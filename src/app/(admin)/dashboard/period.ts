export const PERIODS = ["today", "week", "month", "custom", "all"] as const;
export type Period = (typeof PERIODS)[number];

// i18n key per period — see admin.dashboard.* in the message files.
export const PERIOD_LABEL_KEYS: Record<Period, string> = {
  today: "admin.dashboard.periodToday",
  week: "admin.dashboard.periodWeek",
  month: "admin.dashboard.periodMonth",
  custom: "admin.dashboard.periodCustom",
  all: "admin.dashboard.periodAll",
};

export function parsePeriod(value: string | undefined): Period {
  return (PERIODS as readonly string[]).includes(value ?? "") ? (value as Period) : "all";
}

export type DateRange = { start: Date | null; end: Date | null };

function parseDateInput(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// null start/end means "no bound on that side" — "all" has neither; the
// preset periods have a start but no end (up to now); "custom" has
// whatever the merchant picked, defensively swapped if entered backwards.
export function getDateRange(period: Period, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();
  switch (period) {
    case "today": {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end: null };
    }
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start, end: null };
    }
    case "month": {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { start, end: null };
    }
    case "custom": {
      let start = parseDateInput(customFrom);
      let end = parseDateInput(customTo);
      if (end) end.setHours(23, 59, 59, 999);
      if (start && end && start > end) {
        [start, end] = [end, start];
      }
      return { start, end };
    }
    case "all":
      return { start: null, end: null };
  }
}
