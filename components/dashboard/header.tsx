"use client";

import { Activity, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

interface DashboardHeaderProps {
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
}

const PRESET_RANGES = ["1h", "6h", "24h", "7d", "30d"] as const;

type CustomUnit = "h" | "d";

function parseCustomRange(range: string) {
  const match = range.match(/^(\d+)(h|d)$/);
  if (!match) return { amount: "12", unit: "h" as CustomUnit };
  return {
    amount: match[1],
    unit: match[2] as CustomUnit,
  };
}

export function DashboardHeader({
  timeRange,
  onTimeRangeChange,
}: DashboardHeaderProps) {
  const [isDark, setIsDark] = useState(true);
  const [customAmount, setCustomAmount] = useState(() => parseCustomRange(timeRange).amount);
  const [customUnit, setCustomUnit] = useState<CustomUnit>(() => parseCustomRange(timeRange).unit);

  const isPresetRange = PRESET_RANGES.includes(timeRange as (typeof PRESET_RANGES)[number]);
  const selectValue = isPresetRange ? timeRange : "custom";

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  function applyCustomRange() {
    const amount = Math.max(1, Number.parseInt(customAmount || "1", 10) || 1);
    const normalized = String(amount);
    if (normalized !== customAmount) setCustomAmount(normalized);
    onTimeRangeChange(`${normalized}${customUnit}`);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Activity className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              API Dashboard
            </h1>
            <p className="text-xs text-muted-foreground">Production</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectValue}
            onValueChange={(value) => {
              if (value === "custom") {
                applyCustomRange();
                return;
              }
              onTimeRangeChange(value);
            }}
          >
            <SelectTrigger className="w-[160px] border-border bg-secondary">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="6h">Last 6 hours</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="custom">Custom time</SelectItem>
            </SelectContent>
          </Select>

          {selectValue === "custom" ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onBlur={applyCustomRange}
                className="h-9 w-20 border-border bg-secondary"
                aria-label="Custom time amount"
              />

              <Select
                value={customUnit}
                onValueChange={(value) => {
                  const unit = value as CustomUnit;
                  setCustomUnit(unit);
                  const amount = Math.max(1, Number.parseInt(customAmount || "1", 10) || 1);
                  onTimeRangeChange(`${amount}${unit}`);
                }}
              >
                <SelectTrigger className="h-9 w-[90px] border-border bg-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="h">Hours</SelectItem>
                  <SelectItem value="d">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="h-9 w-9"
          >
            {isDark ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
