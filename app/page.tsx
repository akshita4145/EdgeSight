"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { RoutesTable } from "@/components/dashboard/routes-table";
import { InsightsPanel } from "@/components/dashboard/insights-panel";

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState("24h");

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
      
      <main className="mx-auto max-w-[1600px] px-6 py-6">
        <SummaryCards />
        
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <RoutesTable />
          <InsightsPanel />
        </div>
      </main>
    </div>
  );
}
