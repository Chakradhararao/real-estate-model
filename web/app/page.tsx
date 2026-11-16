import { MapPinned } from "lucide-react";

import RealEstatePanel from "@/components/RealEstatePanel";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-3 py-5 sm:gap-7 sm:px-4 sm:py-8 [&>*]:min-w-0">
        <header className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground sm:size-11">
            <MapPinned className="size-5.5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Property Rates</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">Hyderabad and Bangalore, locality by locality</p>
          </div>
          <ThemeToggle />
        </header>

        <RealEstatePanel />

        <footer className="border-t pt-4 text-xs text-muted-foreground">
          Rates are asking-price ranges gathered from listing portals and public reports, not registered sale prices. Verify with RERA and a
          lawyer before you buy.
        </footer>
      </div>
    </div>
  );
}
