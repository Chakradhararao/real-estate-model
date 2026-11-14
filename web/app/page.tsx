import { Building2 } from "lucide-react";

import RealEstatePanel from "@/components/RealEstatePanel";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-linear-to-b from-emerald-50/60 via-background to-background dark:from-emerald-950/10" />

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-3 py-5 sm:gap-8 sm:px-4 sm:py-8 [&>*]:min-w-0">
        <header className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-indigo-600 text-white shadow-md shadow-emerald-500/20 sm:size-11">
            <Building2 className="size-5.5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Real Estate Dashboard</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">Hyderabad &amp; Bangalore · plots, apartments, villas, independent houses</p>
          </div>
        </header>

        <RealEstatePanel />
      </div>
    </div>
  );
}
