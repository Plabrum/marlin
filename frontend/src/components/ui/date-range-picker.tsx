import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import {
  endOfMonth,
  format,
  parse,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Date-range picker built on shadcn `Calendar` (`mode="range"`) inside a
 * `Popover`. Generic primitive — first introduced for the payroll page
 * (NEA-226), reusable for any future date-range surface (reports, billing
 * windows, calendar filters).
 *
 * Values are wire-format `YYYY-MM-DD` strings (not Date objects) so they
 * round-trip through URL search params cleanly.
 */

export interface DateRangePickerProps {
  /** Inclusive start, `YYYY-MM-DD`. `undefined` means "not yet picked". */
  startDate: string | undefined;
  /** Inclusive end, `YYYY-MM-DD`. `undefined` means "not yet picked". */
  endDate: string | undefined;
  onChange: (range: { startDate: string | undefined; endDate: string | undefined }) => void;
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  return parse(value, "yyyy-MM-dd", new Date());
}

function fromDate(value: Date | undefined): string | undefined {
  if (!value) return undefined;
  return format(value, "yyyy-MM-dd");
}

function displayLabel(start: string | undefined, end: string | undefined, placeholder: string): string {
  const fmt = (s: string) => format(parse(s, "yyyy-MM-dd", new Date()), "MMM d, yyyy");
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `${fmt(start)} – …`;
  return placeholder;
}

interface Preset {
  label: string;
  /** Returns the inclusive `[start, end]` for "now". Computed at click time
   * so a calendar that's left open across midnight still resolves correctly. */
  range: () => { start: Date; end: Date };
}

const _PRESETS: Preset[] = [
  {
    label: "This month",
    range: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }),
  },
  {
    label: "Last month",
    range: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    },
  },
  {
    label: "Last 14 days",
    range: () => {
      const today = new Date();
      return { start: subDays(today, 13), end: today };
    },
  },
  {
    label: "Last 30 days",
    range: () => {
      const today = new Date();
      return { start: subDays(today, 29), end: today };
    },
  },
  {
    label: "Last 90 days",
    range: () => {
      const today = new Date();
      return { start: subDays(today, 89), end: today };
    },
  },
];

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "Pick a date range",
  triggerClassName,
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          // Visual contract matches `FilterSelect`: `h-9` height, `bg-card`
          // surface, focus ring. Filter rows that mix this picker with a
          // FilterSelect read as one design family.
          className={cn(
            "h-9 justify-start gap-2 bg-card font-normal",
            !startDate && "text-muted-foreground",
            triggerClassName,
          )}
        >
          <CalendarIcon className="size-4" />
          {displayLabel(startDate, endDate, placeholder)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Quick presets — most common asks one click away. Selecting a
              preset closes the popover; the calendar is for off-preset ranges. */}
          <div className="flex w-36 flex-col gap-0.5 border-r p-2">
            {_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const r = preset.range();
                  onChange({ startDate: fromDate(r.start), endDate: fromDate(r.end) });
                  setOpen(false);
                }}
                className="rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            {/* Selection header — names the start vs end pick explicitly so
                the user doesn't have to infer from the calendar shading
                what they've picked so far. Cycles: empty → start → end. */}
            <div className="grid grid-cols-2 border-b">
              <div className="border-r px-3 py-2">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Start date
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-sm tabular-nums",
                    startDate ? "text-foreground" : "italic text-muted-foreground",
                  )}
                >
                  {startDate
                    ? format(parse(startDate, "yyyy-MM-dd", new Date()), "MMM d, yyyy")
                    : "Click a date"}
                </div>
              </div>
              <div className="px-3 py-2">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  End date
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-sm tabular-nums",
                    endDate ? "text-foreground" : "italic text-muted-foreground",
                  )}
                >
                  {endDate
                    ? format(parse(endDate, "yyyy-MM-dd", new Date()), "MMM d, yyyy")
                    : startDate
                      ? "Click another date"
                      : "—"}
                </div>
              </div>
            </div>
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={{ from: toDate(startDate), to: toDate(endDate) }}
              onSelect={(range) => {
                onChange({
                  startDate: fromDate(range?.from),
                  endDate: fromDate(range?.to),
                });
                // Auto-close once both ends are picked so the user doesn't
                // have to click outside to dismiss.
                if (range?.from && range?.to) setOpen(false);
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
