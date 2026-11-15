"use client";

import {
  ArrowUpDown,
  Building,
  Building2,
  ChevronRight,
  ExternalLink,
  Home,
  LandPlot,
  LayoutGrid,
  Search,
  Sparkles,
  TrainFront,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import rawData from "@/lib/real-estate/data.json";
import type { City, LocalityRow, MetroInfo, MetroStatus, RealEstateData, Segment, Unit } from "@/lib/real-estate/types";

const DATA = rawData as unknown as RealEstateData;

const SQFT_PER_SQYD = 9;

const SEGMENTS: { key: Segment; label: string; icon: typeof Home }[] = [
  { key: "Plots", label: "Plots", icon: LandPlot },
  { key: "Apartments", label: "Apartments", icon: Building2 },
  { key: "Villas", label: "Villas", icon: Home },
  { key: "Independent Houses", label: "Independent Houses", icon: Building },
];

type SortKey = "price" | "yoy" | "name";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "yoy", label: "YoY" },
  { key: "name", label: "A–Z" },
];

type MetroFilter = "any" | "now" | "coming";
const METRO_FILTERS: { key: MetroFilter; label: string }[] = [
  { key: "any", label: "Any" },
  { key: "now", label: "Running" },
  { key: "coming", label: "Coming" },
];

const METRO_STYLE: Record<Exclude<MetroStatus, "none">, { label: string; chip: string; text: string }> = {
  operational: { label: "Metro", chip: "bg-emerald-600 text-white", text: "text-emerald-700 dark:text-emerald-400" },
  near: { label: "Metro nearby", chip: "border border-emerald-600 text-emerald-700 dark:text-emerald-400", text: "text-emerald-700 dark:text-emerald-400" },
  upcoming: { label: "Under construction", chip: "bg-amber-500 text-white", text: "text-amber-700 dark:text-amber-300" },
  planned: { label: "Planned", chip: "border border-dashed border-slate-400 text-slate-500 dark:text-slate-400", text: "text-slate-600 dark:text-slate-400" },
};

const hasMetro = (m: MetroInfo | null): m is MetroInfo & { status: Exclude<MetroStatus, "none"> } => !!m && m.status !== "none";

function MetroIcon({ metro, size = "sm" }: { metro: MetroInfo | null; size?: "sm" | "md" }) {
  if (!hasMetro(metro)) return null;
  const st = METRO_STYLE[metro.status];
  return (
    <span
      title={`${st.label}: ${metro.line} line · ${metro.station}`}
      aria-label={`${st.label}, ${metro.line} line`}
      className={"inline-flex shrink-0 items-center justify-center rounded " + st.chip + (size === "md" ? " size-5" : " size-4")}
    >
      <TrainFront className={size === "md" ? "size-3.5" : "size-3"} />
    </span>
  );
}

function MetroLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
      {(Object.keys(METRO_STYLE) as (keyof typeof METRO_STYLE)[]).map((k) => (
        <span key={k} className="inline-flex items-center gap-1">
          <MetroIcon metro={{ status: k, line: "", station: METRO_STYLE[k].label, note: "", source_url: "" }} />
          {k === "near" ? "Running line within ~3 km" : METRO_STYLE[k].label === "Metro" ? "Station in locality" : METRO_STYLE[k].label}
        </span>
      ))}
    </div>
  );
}

const CITY_KEY = "re-city";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
const unitLabel = (u: Unit) => (u === "sqyd" ? "sq yd" : "sq ft");
const mid = (r: LocalityRow) => (r.price_low + r.price_high) / 2;
const perSqft = (r: LocalityRow) => (r.unit === "sqyd" ? mid(r) / SQFT_PER_SQYD : mid(r));
// Rows we flag so nobody mistakes them for clean market data.
const isSoft = (r: LocalityRow) => /model estimate|low confidence|promotional|guidance/i.test(`${r.basis} ${r.source}`);

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Short form for tight spots: ₹18K, ₹1.5L.
function inrShort(n: number) {
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(n >= 1e6 ? 0 : 1).replace(/\.0$/, "") + "L";
  if (n >= 1e3) return "₹" + (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
  return inr(n);
}

function lakhOrCrore(rupees: number) {
  if (rupees >= 1e7) return `₹${(rupees / 1e7).toFixed(2)} Cr`;
  return `₹${(rupees / 1e5).toFixed(1)} L`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center gap-1 rounded-lg border bg-background p-1">
      <span className="px-1.5 text-xs font-medium text-muted-foreground">{label}</span>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={
            "rounded-md px-3 py-1 text-xs font-medium transition-colors " +
            (value === o.key
              ? "bg-linear-to-br from-emerald-500 to-indigo-600 text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-3 shadow-sm sm:p-4">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate text-xl font-semibold tabular-nums sm:text-2xl" title={value}>
        {value}
      </span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}

function YoY({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  );
}

// ── Tabs: one overview plus a full rates dashboard per segment ──────────
type TabKey = "overview" | "plots" | "apartments" | "villas" | "houses";
const TAB_SEGMENT: Record<Exclude<TabKey, "overview">, Segment> = {
  plots: "Plots",
  apartments: "Apartments",
  villas: "Villas",
  houses: "Independent Houses",
};
const SEGMENT_TAB = Object.fromEntries(Object.entries(TAB_SEGMENT).map(([k, v]) => [v, k])) as Record<Segment, TabKey>;
const TABS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  ...SEGMENTS.map((s) => ({ key: SEGMENT_TAB[s.key], label: s.label, icon: s.icon })),
];
const isTab = (v: string): v is TabKey => TABS.some((t) => t.key === v);

const segRowsFor = (city: City, segment: Segment) => DATA.rows.filter((r) => r.city === city && r.segment === segment);
const onMetro = (r: LocalityRow) => r.metro?.status === "operational" || r.metro?.status === "near";

function summarize(rows: LocalityRow[]) {
  const yoys = rows.map((r) => r.yoy_pct).filter((v): v is number => v !== null);
  const byMid = [...rows].sort((a, b) => mid(b) - mid(a));
  return {
    count: rows.length,
    median: median(rows.map(mid)),
    low: rows.length ? Math.min(...rows.map((r) => r.price_low)) : 0,
    high: rows.length ? Math.max(...rows.map((r) => r.price_high)) : 0,
    avgYoy: yoys.length ? yoys.reduce((s, v) => s + v, 0) / yoys.length : null,
    yoyCount: yoys.length,
    metro: rows.filter(onMetro).length,
    top: byMid[0],
    cheapest: byMid[byMid.length - 1],
    unit: (rows[0]?.unit ?? "sqft") as Unit,
  };
}

// ── "Which to buy" scoring ───────────────────────────────────────────────
// A transparent screen, not advice: each locality gets 0–100 on value (how far
// its midpoint sits below the segment's priciest), growth (reported YoY) and
// metro access, blended by the chosen priority. Soft data loses 10 points.
type Priority = "balanced" | "value" | "growth" | "metro";
const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "balanced", label: "Balanced" },
  { key: "value", label: "Lower price" },
  { key: "growth", label: "Growth" },
  { key: "metro", label: "Metro" },
];
const WEIGHTS: Record<Priority, { value: number; growth: number; metro: number }> = {
  balanced: { value: 0.35, growth: 0.3, metro: 0.35 },
  value: { value: 0.6, growth: 0.15, metro: 0.25 },
  growth: { value: 0.2, growth: 0.6, metro: 0.2 },
  metro: { value: 0.2, growth: 0.2, metro: 0.6 },
};
const METRO_SCORE: Record<MetroStatus, number> = { operational: 100, near: 80, upcoming: 65, planned: 35, none: 10 };
const SOFT_PENALTY = 10;
const NEUTRAL_GROWTH = 40; // used when no source reports YoY

type Scored = { r: LocalityRow; score: number; value: number; growth: number; metro: number; reasons: string[]; cautions: string[] };

function scoreRows(rows: LocalityRow[], priority: Priority): Scored[] {
  if (!rows.length) return [];
  const mids = rows.map(mid);
  const lo = Math.min(...mids);
  const hi = Math.max(...mids);
  const med = median(mids);
  const w = WEIGHTS[priority];
  return rows
    .map((r) => {
      const m = mid(r);
      const value = hi === lo ? 50 : ((hi - m) / (hi - lo)) * 100;
      const growth = r.yoy_pct === null ? NEUTRAL_GROWTH : Math.max(0, Math.min(100, (r.yoy_pct / 20) * 100));
      const status = r.metro?.status ?? "none";
      const metro = METRO_SCORE[status];
      const soft = isSoft(r);
      const score = Math.max(0, Math.round(w.value * value + w.growth * growth + w.metro * metro - (soft ? SOFT_PENALTY : 0)));

      const reasons: string[] = [];
      const cautions: string[] = [];
      const vsMed = med ? ((m - med) / med) * 100 : 0;
      if (vsMed <= -5) reasons.push(`${Math.abs(vsMed).toFixed(0)}% below the segment median`);
      else if (vsMed >= 25) cautions.push(`${vsMed.toFixed(0)}% above the segment median`);
      if (r.yoy_pct !== null && r.yoy_pct >= 8) reasons.push(`+${r.yoy_pct}% reported YoY`);
      else if (r.yoy_pct !== null && r.yoy_pct < 5) cautions.push(`slow growth (${r.yoy_pct > 0 ? "+" : ""}${r.yoy_pct}% YoY)`);
      else if (r.yoy_pct === null) cautions.push("no YoY figure reported");
      if (hasMetro(r.metro)) {
        if (status === "operational") reasons.push(`${r.metro.line} line station in the locality`);
        else if (status === "near") reasons.push(`${r.metro.line} line running within ~3 km`);
        else if (status === "upcoming") reasons.push(`${r.metro.line} line under construction`);
        else cautions.push(`metro only planned (${r.metro.line}), not approved or built yet`);
      } else cautions.push("no metro line");
      if (soft) cautions.push("rate is an estimate, guidance value or developer quote");
      if (r.price_high > r.price_low * 2) cautions.push("very wide price range");
      return { r, score, value, growth, metro, reasons, cautions };
    })
    .sort((a, b) => b.score - a.score || mid(a.r) - mid(b.r));
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 65
      ? "bg-emerald-600 text-white"
      : score >= 45
        ? "bg-amber-500 text-white"
        : "bg-muted text-muted-foreground";
  return (
    <span className={"inline-flex h-7 min-w-9 shrink-0 items-center justify-center rounded-lg px-1.5 text-sm font-semibold tabular-nums " + tone} title="Score out of 100">
      {score}
    </span>
  );
}

function MiniBar({ label, value }: { label: string; value: number }) {
  return (
    <span className="grid grid-cols-[3.2rem_1fr] items-center gap-1.5 text-[11px] text-muted-foreground">
      {label}
      <span className="h-1.5 rounded-full bg-muted">
        <span className="block h-full rounded-full bg-indigo-500/80" style={{ width: `${Math.round(value)}%` }} />
      </span>
    </span>
  );
}

function BuyShortlist({
  city,
  segment,
  rows,
  unit,
  budget,
  areaNum,
}: {
  city: City;
  segment: Segment;
  rows: LocalityRow[];
  unit: Unit;
  budget: number;
  areaNum: number;
}) {
  const [priority, setPriority] = useState<Priority>("balanced");
  const [budgetOnly, setBudgetOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const scored = useMemo(() => scoreRows(rows, priority), [rows, priority]);
  const list = budgetOnly && budget > 0 ? scored.filter((x) => x.r.price_low * areaNum <= budget) : scored;
  const shown = showAll ? list : list.slice(0, 3);
  const u = unitLabel(unit);

  return (
    <Card className="border-indigo-500/30 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
          <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400" /> Which to buy · {segment} in {city}
        </CardTitle>
        <CardDescription className="text-xs">
          Localities ranked by a score out of 100 that blends price, reported yearly growth and metro access. Pick what matters most to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Toggle label="Priority" options={PRIORITIES} value={priority} onChange={setPriority} />
          {budget > 0 && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground" htmlFor="re-budget-only">
              <input id="re-budget-only" type="checkbox" checked={budgetOnly} onChange={(e) => setBudgetOnly(e.target.checked)} className="size-3.5 accent-indigo-600" />
              Only within my budget ({lakhOrCrore(budget)} for {areaNum.toLocaleString("en-IN")} {u})
            </label>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing fits that budget. Change the budget or size in “What fits my budget” below.</p>
        ) : (
          <ol className="grid gap-3 lg:grid-cols-3">
            {shown.map((x, i) => (
              <li key={x.r.locality} className={"flex min-w-0 flex-col gap-2 rounded-xl border p-3 " + (i === 0 && !showAll ? "border-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/20" : "bg-card")}>
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {i === 0 ? "Top pick" : `#${i + 1}`}
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-semibold">{x.r.locality}</span>
                      <MetroIcon metro={x.r.metro} />
                    </span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {x.r.zone} · {inr(mid(x.r))}/{u}
                    </span>
                  </span>
                  <ScoreBadge score={x.score} />
                </div>
                <div className="flex flex-col gap-1">
                  <MiniBar label="Price" value={x.value} />
                  <MiniBar label="Growth" value={x.growth} />
                  <MiniBar label="Metro" value={x.metro} />
                </div>
                {x.reasons.length > 0 && (
                  <ul className="flex flex-col gap-0.5 text-xs">
                    {x.reasons.map((t) => (
                      <li key={t} className="flex gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400">+</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                {x.cautions.length > 0 && (
                  <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                    {x.cautions.map((t) => (
                      <li key={t} className="flex gap-1.5">
                        <span className="text-amber-600 dark:text-amber-400">!</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}

        {list.length > 3 && (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="self-start text-xs font-medium text-indigo-700 hover:underline dark:text-indigo-300">
            {showAll ? "Show top 3 only" : `Show all ${list.length} ranked`}
          </button>
        )}

        <p className="text-[11px] text-muted-foreground">
          This is a screen built from asking prices, not financial advice. It can&apos;t see title and legal status, builder track record, water, flooding
          or resale demand. Before paying anything, check the RERA registration, get the title verified by a lawyer and visit the site.
        </p>
      </CardContent>
    </Card>
  );
}

const SEGMENT_BLURB: Record<Segment, string> = {
  Plots: "Open plots and layouts. Hyderabad quotes land per sq yd; Bangalore per sq ft.",
  Apartments: "Flats in apartment complexes, per sq ft of saleable area.",
  Villas: "Gated-community villas, per sq ft of built-up area.",
  "Independent Houses": "Standalone houses on their own plot, per sq ft of built-up area.",
};

export default function RealEstatePanel() {
  const [city, setCity] = useState<City>("Hyderabad");
  const [tab, setTab] = useState<TabKey>("overview");

  // Restore the saved city, and the tab from the link (#plots, #villas…).
  useEffect(() => {
    try {
      const c = localStorage.getItem(CITY_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved preference after mount
      if (c === "Hyderabad" || c === "Bangalore") setCity(c);
    } catch {
      /* storage unavailable — defaults are fine */
    }
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (isTab(h)) setTab(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function pickCity(c: City) {
    setCity(c);
    try {
      localStorage.setItem(CITY_KEY, c);
    } catch {
      /* ignore */
    }
  }
  function openTab(t: TabKey) {
    setTab(t);
    if (window.location.hash.slice(1) !== t) window.location.hash = t;
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 [&>*]:min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="min-w-0 text-sm text-muted-foreground">
          Asking-price ranges by locality · snapshot {formatDate(DATA.snapshot)} · alerts at ±{DATA.threshold_pct}% between snapshots
        </p>
        <Toggle label="City" options={DATA.cities.map((c) => ({ key: c, label: c }))} value={city} onChange={pickCity} />
      </div>

      <nav
        role="tablist"
        aria-label="Dashboards"
        className="sticky top-0 z-20 -mx-3 flex gap-1 overflow-x-auto border-b bg-background/90 px-3 backdrop-blur [scrollbar-width:none] sm:mx-0 sm:rounded-xl sm:border sm:p-1 sm:shadow-sm [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          const n = key === "overview" ? null : segRowsFor(city, TAB_SEGMENT[key]).length;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`tab-${key}`}
              aria-selected={active}
              aria-controls={`panel-${key}`}
              onClick={() => openTab(key)}
              className={
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:rounded-lg sm:border-b-0 " +
                (active
                  ? "border-foreground text-foreground sm:bg-foreground sm:text-background sm:shadow"
                  : "border-transparent text-muted-foreground hover:text-foreground sm:hover:bg-muted")
              }
            >
              <Icon className="size-4" />
              {label}
              {n !== null && (
                <span className={"rounded-full px-1.5 text-[11px] tabular-nums " + (active ? "bg-muted sm:bg-background/20" : "bg-muted")}>{n}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="flex min-w-0 flex-col gap-6 [&>*]:min-w-0">
        {tab === "overview" ? (
          <Overview city={city} onOpen={(s) => openTab(SEGMENT_TAB[s])} />
        ) : (
          <SegmentDashboard key={`${tab}-${city}`} city={city} segment={TAB_SEGMENT[tab]} onCity={pickCity} />
        )}
      </div>
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────
function Overview({ city, onOpen }: { city: City; onOpen: (s: Segment) => void }) {
  const compare = useMemo(
    () =>
      SEGMENTS.map(({ key, label }) => {
        const med = (c: City) => median(segRowsFor(c, key).map(perSqft));
        return { key, label, hyd: med("Hyderabad"), blr: med("Bangalore") };
      }),
    [],
  );
  const compareMax = Math.max(1, ...compare.flatMap((c) => [c.hyd, c.blr]));
  const changes = DATA.changes.filter((c) => c.city === city && c.triggered);

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{city} at a glance</h2>
        <p className="text-sm text-muted-foreground">Open a segment for its full rates dashboard.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SEGMENTS.map(({ key, label, icon: Icon }) => {
          const s = summarize(segRowsFor(city, key));
          const top = scoreRows(segRowsFor(city, key), "balanced")[0];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onOpen(key)}
              className="group flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-foreground/40"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-indigo-600 text-white">
                    <Icon className="size-4" />
                  </span>
                  {label}
                </span>
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </span>
              {s.count === 0 ? (
                <span className="text-sm text-muted-foreground">No data yet</span>
              ) : (
                <>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold tabular-nums">{inr(s.median)}</span>
                    <span className="text-xs text-muted-foreground">/ {unitLabel(s.unit)} median</span>
                  </span>
                  <span className="grid grid-cols-3 gap-2 text-xs">
                    <span>
                      <span className="block text-muted-foreground">Range</span>
                      <span className="tabular-nums">
                        {inr(s.low)}–{inr(s.high)}
                      </span>
                    </span>
                    <span>
                      <span className="block text-muted-foreground">Avg YoY</span>
                      <YoY value={s.avgYoy === null ? null : Number(s.avgYoy.toFixed(1))} />
                    </span>
                    <span>
                      <span className="block text-muted-foreground">On metro</span>
                      <span className="tabular-nums">
                        {s.metro} of {s.count}
                      </span>
                    </span>
                  </span>
                  {top && (
                    <span className="flex items-center gap-1.5 border-t pt-2 text-xs">
                      <Sparkles className="size-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-muted-foreground">Top pick</span>
                      <span className="truncate font-medium">{top.r.locality}</span>
                      <span className="ml-auto tabular-nums text-muted-foreground">score {top.score}</span>
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold tracking-tight">Hyderabad vs Bangalore</CardTitle>
            <CardDescription className="text-xs">
              Median midpoint per sq ft, by segment (Hyderabad plots converted from sq yd). Each city tracks different localities, so treat this as a rough guide.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {compare.map((c) => (
              <div key={c.key} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {c.hyd && c.blr ? `Bangalore ${c.blr >= c.hyd ? "+" : ""}${(((c.blr - c.hyd) / c.hyd) * 100).toFixed(0)}% vs Hyderabad` : ""}
                  </span>
                </div>
                {(["Hyderabad", "Bangalore"] as const).map((name) => {
                  const v = name === "Hyderabad" ? c.hyd : c.blr;
                  return (
                    <div key={name} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-2 text-xs">
                      <span className={name === city ? "font-semibold" : "text-muted-foreground"}>{name}</span>
                      <span className="h-2 rounded-full bg-muted">
                        <span
                          className={"block h-full rounded-full " + (name === "Hyderabad" ? "bg-emerald-500" : "bg-indigo-500")}
                          style={{ width: `${(v / compareMax) * 100}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums">{v ? inr(v) : "—"}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold tracking-tight">Price alerts · {city}</CardTitle>
            <CardDescription className="text-xs">
              {DATA.compared
                ? `Localities that moved ±${DATA.threshold_pct}% or more between ${formatDate(DATA.compared.from)} and ${formatDate(DATA.compared.to)}.`
                : "Alerts start once there are two snapshots to compare."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {DATA.compared
                  ? "No locality crossed the threshold."
                  : `Baseline saved on ${formatDate(DATA.snapshot)}. The weekly job sends Telegram alerts from the next snapshot.`}
              </p>
            ) : (
              <ul className="flex flex-col divide-y text-sm">
                {changes.map((c) => (
                  <li key={`${c.segment}-${c.locality}`} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.locality}</span>
                      <span className="block text-xs text-muted-foreground">{c.segment}</span>
                    </span>
                    <span className="text-right text-xs tabular-nums">
                      <span className={"block font-semibold " + (c.change_pct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                        {c.change_pct > 0 ? "+" : ""}
                        {c.change_pct.toFixed(1)}%
                      </span>
                      <span className="block text-muted-foreground">
                        {inr(c.old_price)} → {inr(c.last_price)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <details className="group rounded-xl border bg-card p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold">Data feeds behind these numbers ({DATA.feeds.length})</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-2 font-medium">Feed</th>
                <th className="pb-2 font-medium">Covers</th>
                <th className="pb-2 font-medium">Cadence</th>
                <th className="pb-2 font-medium">Use</th>
              </tr>
            </thead>
            <tbody>
              {DATA.feeds.map((f) => (
                <tr key={f.name} className="border-t align-top">
                  <td className="py-2 pr-3 font-medium">{f.name}</td>
                  <td className="py-2 pr-3">{f.covers}</td>
                  <td className="whitespace-nowrap py-2 pr-3">{f.cadence}</td>
                  <td className="py-2">{f.use_for}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

// ── One segment's rates dashboard ────────────────────────────────────────
type TableSort = { key: "locality" | "zone" | "price_low" | "price_high" | "mid" | "yoy_pct"; dir: 1 | -1 };

function SortTh({
  k,
  label,
  num,
  sort,
  onSort,
}: {
  k: TableSort["key"];
  label: string;
  num?: boolean;
  sort: TableSort;
  onSort: (k: TableSort["key"]) => void;
}) {
  const active = sort.key === k;
  return (
    <th className={"whitespace-nowrap pb-2 font-medium " + (num ? "text-right" : "text-left")} aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(k)} className={"inline-flex items-center gap-1 hover:text-foreground " + (active ? "text-foreground" : "")}>
        {label}
        <ArrowUpDown className={"size-3 " + (active ? "opacity-100" : "opacity-40")} />
      </button>
    </th>
  );
}

function SegmentDashboard({ city, segment, onCity }: { city: City; segment: Segment; onCity: (c: City) => void }) {
  const [sort, setSort] = useState<SortKey>("price");
  const [zone, setZone] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [metroFilter, setMetroFilter] = useState<MetroFilter>("any");
  const [selected, setSelected] = useState<string | null>(null);
  const [tableSort, setTableSort] = useState<TableSort>({ key: "mid", dir: -1 });
  const [budgetLakh, setBudgetLakh] = useState("90");
  const [area, setArea] = useState("");

  const segRows = useMemo(() => segRowsFor(city, segment), [city, segment]);
  const unit: Unit = segRows[0]?.unit ?? "sqft";
  const u = unitLabel(unit);
  const zones = useMemo(() => ["All", ...Array.from(new Set(segRows.map((r) => r.zone))).sort()], [segRows]);
  const stats = useMemo(() => summarize(segRows), [segRows]);
  const segInfo = SEGMENTS.find((s) => s.key === segment)!;
  const SegIcon = segInfo.icon;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const metroOk = (r: LocalityRow) => {
      const s = r.metro?.status ?? "none";
      if (metroFilter === "now") return s === "operational" || s === "near";
      if (metroFilter === "coming") return s === "upcoming" || s === "planned";
      return true;
    };
    return segRows.filter(
      (r) => (zone === "All" || r.zone === zone) && metroOk(r) && (!q || r.locality.toLowerCase().includes(q) || r.zone.toLowerCase().includes(q)),
    );
  }, [segRows, zone, query, metroFilter]);

  const rows = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (sort === "name") return a.locality.localeCompare(b.locality);
        if (sort === "yoy") return (b.yoy_pct ?? -Infinity) - (a.yoy_pct ?? -Infinity);
        return mid(b) - mid(a);
      }),
    [filtered, sort],
  );

  const tableRows = useMemo(() => {
    const val = (r: LocalityRow): number | string => {
      if (tableSort.key === "mid") return mid(r);
      if (tableSort.key === "yoy_pct") return r.yoy_pct ?? -Infinity;
      return r[tableSort.key];
    };
    return [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number)) * tableSort.dir;
    });
  }, [filtered, tableSort]);

  const scaleMax = Math.max(1, ...rows.map((r) => r.price_high));
  const detail = rows.find((r) => r.locality === selected) ?? null;
  const softCount = segRows.filter(isSoft).length;

  const defaultArea = segment === "Plots" ? (unit === "sqyd" ? 200 : 1200) : segment === "Apartments" ? 1500 : 2400;
  const areaNum = Number(area) > 0 ? Number(area) : defaultArea;
  const budget = Number(budgetLakh) > 0 ? Number(budgetLakh) * 1e5 : 0;
  const fits = useMemo(
    () =>
      segRows
        .map((r) => ({ r, low: r.price_low * areaNum, high: r.price_high * areaNum }))
        .filter((x) => budget > 0 && x.low <= budget)
        .sort((a, b) => b.low - a.low),
    [segRows, areaNum, budget],
  );

  const otherCity: City = city === "Hyderabad" ? "Bangalore" : "Hyderabad";
  const both = useMemo(
    () => (["Hyderabad", "Bangalore"] as City[]).map((c) => ({ city: c, s: summarize(segRowsFor(c, segment)) })),
    [segment],
  );

  function headerSort(key: TableSort["key"]) {
    setTableSort((t) => (t.key === key ? { key, dir: (t.dir * -1) as 1 | -1 } : { key, dir: key === "locality" || key === "zone" ? 1 : -1 }));
  }
  return (
    <>
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-indigo-600 text-white shadow-sm">
          <SegIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">
            {segment} rates · {city}
          </h2>
          <p className="text-sm text-muted-foreground">{SEGMENT_BLURB[segment]}</p>
        </div>
      </div>

      {segRows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No {segment.toLowerCase()} data for {city} yet. Add rows to real_estate/data/localities.csv and re-export.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Median rate" value={inr(stats.median)} note={`per ${u}, range midpoint`} />
            <Stat label="Rate band" value={`${inrShort(stats.low)}–${inrShort(stats.high)}`} note={`lowest to highest, per ${u}`} />
            <Stat
              label="Avg YoY"
              value={stats.avgYoy === null ? "n/a" : `${stats.avgYoy > 0 ? "+" : ""}${stats.avgYoy.toFixed(1)}%`}
              note={stats.yoyCount ? `${stats.yoyCount} of ${stats.count} localities report it` : "no source reports YoY yet"}
            />
            <Stat label="On metro now" value={`${stats.metro} of ${stats.count}`} note="station in or within ~3 km" />
            <Stat label="Priciest" value={stats.top?.locality ?? "—"} note={stats.top ? `${inr(mid(stats.top))} / ${u}` : undefined} />
          </div>

          {(softCount > 0 || segment === "Independent Houses") && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {softCount} of {segRows.length} rows here are estimates, government guidance values or developer quotes (marked in amber).
                {segment === "Independent Houses" && city === "Bangalore" &&
                  " Bangalore houses are modelled: plot rate on a 30×40 site + G+1 build at ₹2,500/sq ft, per 2,400 sq ft built-up."}
                {unit === "sqyd" && " Hyderabad plots are quoted per sq yd (1 sq yd = 9 sq ft)."}
              </span>
            </p>
          )}

          <BuyShortlist city={city} segment={segment} rows={segRows} unit={unit} budget={budget} areaNum={areaNum} />

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-40 flex-1 sm:max-w-60">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input id="re-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search locality" className="h-8 pl-8 text-sm" aria-label="Search locality" />
              </div>
              <Toggle label="Metro" options={METRO_FILTERS} value={metroFilter} onChange={setMetroFilter} />
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Zone">
              {zones.map((z) => (
                <button
                  key={z}
                  type="button"
                  aria-pressed={zone === z}
                  onClick={() => setZone(z)}
                  className={"rounded-full border px-2.5 py-0.5 text-xs transition-colors " + (zone === z ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted")}
                >
                  {z}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Showing {filtered.length} of {segRows.length} localities. Filters apply to the chart and the rates table.
            </p>
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold tracking-tight">Price range by locality</CardTitle>
              <CardDescription className="text-xs">Bar spans low to high asking rate per {u}; the dot is the midpoint. Tap a locality for details.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Toggle label="Sort" options={SORTS} value={sort} onChange={setSort} />
                <MetroLegend />
              </div>
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No localities match.</p>
              ) : (
                <ul className="flex flex-col">
                  {rows.map((r) => {
                    const left = (r.price_low / scaleMax) * 100;
                    const width = Math.max(1.2, ((r.price_high - r.price_low) / scaleMax) * 100);
                    const dot = (mid(r) / scaleMax) * 100;
                    const open = selected === r.locality;
                    const soft = isSoft(r);
                    return (
                      <li key={r.locality} className="border-t first:border-t-0">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={() => setSelected(open ? null : r.locality)}
                          className="grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-md px-1 py-2 text-left hover:bg-muted/60 sm:grid-cols-[11rem_1fr_9rem]"
                        >
                          <span className="min-w-0">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-sm font-medium">{r.locality}</span>
                              <MetroIcon metro={r.metro} />
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {r.zone}
                              {hasMetro(r.metro) && <span className={METRO_STYLE[r.metro.status].text}> · {r.metro.line}</span>}
                            </span>
                          </span>
                          <span className="relative order-last col-span-2 h-2.5 rounded-full bg-muted sm:order-none sm:col-span-1" aria-hidden>
                            <span
                              className={"absolute inset-y-0 rounded-full " + (soft ? "bg-amber-400/70" : "bg-linear-to-r from-emerald-500/70 to-indigo-500/70")}
                              style={{ left: `${left}%`, width: `${width}%` }}
                            />
                            <span
                              className={"absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background " + (soft ? "bg-amber-500" : "bg-indigo-600")}
                              style={{ left: `${dot}%` }}
                            />
                          </span>
                          <span className="text-right text-xs tabular-nums">
                            <span className="block font-semibold text-foreground">{inr(mid(r))}</span>
                            <span className="block text-muted-foreground">
                              <YoY value={r.yoy_pct} /> YoY
                            </span>
                          </span>
                        </button>
                        {open && detail && (
                          <div className="mb-2 grid gap-2 rounded-lg border bg-muted/30 p-3 text-xs sm:grid-cols-2">
                            <div>
                              <div className="text-muted-foreground">Range</div>
                              <div className="font-medium tabular-nums">
                                {detail.price_low === detail.price_high ? `${inr(detail.price_low)} / ${u}` : `${inr(detail.price_low)} – ${inr(detail.price_high)} / ${u}`}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Basis</div>
                              <div className={"font-medium " + (isSoft(detail) ? "text-amber-700 dark:text-amber-300" : "")}>{detail.basis}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Typical ticket</div>
                              <div className="font-medium tabular-nums">
                                {lakhOrCrore(detail.price_low * defaultArea)} – {lakhOrCrore(detail.price_high * defaultArea)}
                                <span className="font-normal text-muted-foreground">
                                  {" "}
                                  for {defaultArea.toLocaleString("en-IN")} {u}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Source · as of {formatDate(detail.as_of)}</div>
                              <a href={detail.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline">
                                {detail.source}
                                <ExternalLink className="size-3" />
                              </a>
                            </div>
                            <div className="sm:col-span-2">
                              <div className="text-muted-foreground">Metro</div>
                              {hasMetro(detail.metro) ? (
                                <div className="flex items-start gap-1.5">
                                  <MetroIcon metro={detail.metro} size="md" />
                                  <span>
                                    <span className={"font-medium " + METRO_STYLE[detail.metro.status].text}>
                                      {METRO_STYLE[detail.metro.status].label} · {detail.metro.line} line
                                    </span>
                                    <span className="text-foreground"> — {detail.metro.station}</span>
                                    {detail.metro.note && <span className="block text-muted-foreground">{detail.metro.note}</span>}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-muted-foreground">No metro line yet{detail.metro?.note ? ` · ${detail.metro.note}` : ""}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                Scale 0 – {inr(scaleMax)} per {u}. Amber = estimate, guidance value or developer quote.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold tracking-tight">
                {segment} rate card · {city}
              </CardTitle>
              <CardDescription className="text-xs">Every tracked locality with its low, high and midpoint rate per {u}. Click a column to sort.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <SortTh k="locality" label="Locality" sort={tableSort} onSort={headerSort} />
                      <SortTh k="zone" label="Zone" sort={tableSort} onSort={headerSort} />
                      <SortTh k="price_low" label={`Low ₹/${u}`} num sort={tableSort} onSort={headerSort} />
                      <SortTh k="price_high" label={`High ₹/${u}`} num sort={tableSort} onSort={headerSort} />
                      <SortTh k="mid" label="Mid" num sort={tableSort} onSort={headerSort} />
                      <SortTh k="yoy_pct" label="YoY" num sort={tableSort} onSort={headerSort} />
                      <th className="pb-2 pl-3 text-left font-medium">Metro</th>
                      <th className="pb-2 pl-3 text-left font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => (
                      <tr key={r.locality} className={"border-t align-top " + (isSoft(r) ? "bg-amber-50/60 dark:bg-amber-950/20" : "")}>
                        <td className="py-2 pr-3 font-medium">{r.locality}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.zone}</td>
                        <td className="py-2 pl-3 text-right tabular-nums">{r.price_low.toLocaleString("en-IN")}</td>
                        <td className="py-2 pl-3 text-right tabular-nums">{r.price_high.toLocaleString("en-IN")}</td>
                        <td className="py-2 pl-3 text-right font-semibold tabular-nums">{Math.round(mid(r)).toLocaleString("en-IN")}</td>
                        <td className="py-2 pl-3 text-right tabular-nums">
                          <YoY value={r.yoy_pct} />
                        </td>
                        <td className="py-2 pl-3 text-xs">
                          {hasMetro(r.metro) ? (
                            <span className="inline-flex items-center gap-1.5">
                              <MetroIcon metro={r.metro} />
                              <span className={METRO_STYLE[r.metro.status].text}>{r.metro.line}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 pl-3 text-xs">
                          <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {r.source}
                          </a>
                          <span className="block text-muted-foreground">
                            {r.basis} · {formatDate(r.as_of)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                  <Wallet className="size-4" /> What fits my budget
                </CardTitle>
                <CardDescription className="text-xs">
                  {segment} in {city} where the low end of the range fits, for the size you enter.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor="re-budget">
                    Budget (₹ lakh)
                    <Input id="re-budget" inputMode="decimal" value={budgetLakh} onChange={(e) => setBudgetLakh(e.target.value)} className="h-8 w-28 text-sm tabular-nums" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor="re-area">
                    Size ({u}
                    {segment === "Plots" ? "" : " built-up"})
                    <Input id="re-area" inputMode="numeric" value={area} placeholder={String(defaultArea)} onChange={(e) => setArea(e.target.value)} className="h-8 w-28 text-sm tabular-nums" />
                  </label>
                  <p className="pb-1.5 text-xs text-muted-foreground">{budget > 0 ? `${fits.length} of ${segRows.length} localities` : "Enter a budget"}</p>
                </div>
                {budget > 0 && fits.length === 0 && <p className="text-sm text-muted-foreground">Nothing fits yet. Try a smaller size or a bigger budget.</p>}
                {fits.length > 0 && (
                  <ul className="flex flex-col divide-y text-sm">
                    {fits.map(({ r, low, high }) => (
                      <li key={r.locality} className="flex items-center justify-between gap-3 py-2">
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="truncate">{r.locality}</span>
                            <MetroIcon metro={r.metro} />
                          </span>
                          <span className="block text-xs text-muted-foreground">{r.zone}</span>
                        </span>
                        <span className="text-right text-xs tabular-nums">
                          <span className="block font-medium">{low === high ? lakhOrCrore(low) : `${lakhOrCrore(low)} – ${lakhOrCrore(high)}`}</span>
                          {high <= budget ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Whole range fits</span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-300">Low end only</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Asking price only. Add stamp duty and registration (roughly 6–8% in both states), GST on under-construction homes, and interiors.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-bold tracking-tight">{segment} in both cities</CardTitle>
                <CardDescription className="text-xs">Same segment, side by side, in each city&apos;s own unit.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {both.map(({ city: c, s }) => (
                  <div key={c} className={"flex flex-col gap-2 rounded-lg border p-3 " + (c === city ? "border-foreground/30 bg-muted/30" : "")}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{c}</span>
                      {c !== city && (
                        <button type="button" onClick={() => onCity(c)} className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
                          Open <ChevronRight className="size-3" />
                        </button>
                      )}
                    </div>
                    {s.count === 0 ? (
                      <span className="text-sm text-muted-foreground">No data yet</span>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <span>
                          <span className="block text-muted-foreground">Median</span>
                          <span className="font-medium tabular-nums">
                            {inr(s.median)}/{unitLabel(s.unit)}
                          </span>
                        </span>
                        <span>
                          <span className="block text-muted-foreground">Localities</span>
                          <span className="font-medium tabular-nums">{s.count}</span>
                        </span>
                        <span>
                          <span className="block text-muted-foreground">On metro</span>
                          <span className="font-medium tabular-nums">{s.metro}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="block text-muted-foreground">Most affordable</span>
                          <span className="block truncate font-medium">{s.cheapest?.locality}</span>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  Switching to {otherCity} keeps you on the {segment} tab.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
