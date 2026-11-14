"use client";

import { Building, Building2, ExternalLink, Home, LandPlot, Search, TrainFront, TriangleAlert, Wallet } from "lucide-react";
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
const SEGMENT_KEY = "re-segment";

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

export default function RealEstatePanel() {
  const [city, setCity] = useState<City>("Hyderabad");
  const [segment, setSegment] = useState<Segment>("Apartments");
  const [sort, setSort] = useState<SortKey>("price");
  const [zone, setZone] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [metroFilter, setMetroFilter] = useState<MetroFilter>("any");
  const [selected, setSelected] = useState<string | null>(null);
  const [budgetLakh, setBudgetLakh] = useState("90");
  const [area, setArea] = useState("");

  // Restore the last city/segment, same as the dashboard tab.
  useEffect(() => {
    try {
      const c = localStorage.getItem(CITY_KEY);
      const s = localStorage.getItem(SEGMENT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved preference after mount
      if (c === "Hyderabad" || c === "Bangalore") setCity(c);
      if (SEGMENTS.some((x) => x.key === s)) setSegment(s as Segment);
    } catch {
      /* storage unavailable — defaults are fine */
    }
  }, []);

  function pickCity(c: City) {
    setCity(c);
    setZone("All");
    setSelected(null);
    try {
      localStorage.setItem(CITY_KEY, c);
    } catch {
      /* ignore */
    }
  }
  function pickSegment(s: Segment) {
    setSegment(s);
    setZone("All");
    setSelected(null);
    setArea("");
    try {
      localStorage.setItem(SEGMENT_KEY, s);
    } catch {
      /* ignore */
    }
  }

  const segRows = useMemo(() => DATA.rows.filter((r) => r.city === city && r.segment === segment), [city, segment]);
  const unit: Unit = segRows[0]?.unit ?? "sqft";
  const zones = useMemo(() => ["All", ...Array.from(new Set(segRows.map((r) => r.zone))).sort()], [segRows]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const metroOk = (r: LocalityRow) => {
      const s = r.metro?.status ?? "none";
      if (metroFilter === "now") return s === "operational" || s === "near";
      if (metroFilter === "coming") return s === "upcoming" || s === "planned";
      return true;
    };
    const list = segRows.filter(
      (r) =>
        (zone === "All" || r.zone === zone) &&
        metroOk(r) &&
        (!q || r.locality.toLowerCase().includes(q) || r.zone.toLowerCase().includes(q)),
    );
    return list.sort((a, b) => {
      if (sort === "name") return a.locality.localeCompare(b.locality);
      if (sort === "yoy") return (b.yoy_pct ?? -Infinity) - (a.yoy_pct ?? -Infinity);
      return mid(b) - mid(a);
    });
  }, [segRows, zone, query, sort, metroFilter]);

  const stats = useMemo(() => {
    const mids = segRows.map(mid);
    const yoys = segRows.map((r) => r.yoy_pct).filter((v): v is number => v !== null);
    const byMid = [...segRows].sort((a, b) => mid(b) - mid(a));
    return {
      median: median(mids),
      count: segRows.length,
      avgYoy: yoys.length ? yoys.reduce((s, v) => s + v, 0) / yoys.length : null,
      yoyCount: yoys.length,
      top: byMid[0],
      cheapest: byMid[byMid.length - 1],
    };
  }, [segRows]);

  const scaleMax = Math.max(1, ...rows.map((r) => r.price_high));
  const detail = rows.find((r) => r.locality === selected) ?? null;

  // Budget finder: which localities fit a budget for a given size.
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

  // City comparison on a common ₹/sq ft basis.
  const compare = useMemo(
    () =>
      SEGMENTS.map(({ key, label }) => {
        const med = (c: City) => median(DATA.rows.filter((r) => r.city === c && r.segment === key).map(perSqft));
        return { key, label, hyd: med("Hyderabad"), blr: med("Bangalore") };
      }),
    [],
  );
  const compareMax = Math.max(1, ...compare.flatMap((c) => [c.hyd, c.blr]));

  const changes = DATA.changes.filter((c) => c.city === city && c.triggered);
  const softCount = segRows.filter(isSoft).length;

  return (
    <div className="flex min-w-0 flex-col gap-6 [&>*]:min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">Real Estate · Hyderabad &amp; Bangalore</h2>
          <p className="text-sm text-muted-foreground">
            Asking-price ranges by locality. Snapshot {formatDate(DATA.snapshot)} · alerts at ±{DATA.threshold_pct}% between snapshots.
          </p>
        </div>
        <Toggle label="City" options={DATA.cities.map((c) => ({ key: c, label: c }))} value={city} onChange={pickCity} />
      </div>

      <div
        role="tablist"
        aria-label="Property segment"
        className="flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border bg-background/70 p-1 shadow-sm [scrollbar-width:none] sm:inline-flex sm:w-fit sm:flex-wrap [&::-webkit-scrollbar]:hidden"
      >
        {SEGMENTS.map(({ key, label, icon: Icon }) => {
          const active = segment === key;
          const n = DATA.rows.filter((r) => r.city === city && r.segment === key).length;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pickSegment(key)}
              className={
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                (active ? "bg-foreground text-background shadow" : "text-muted-foreground hover:bg-muted hover:text-foreground")
              }
            >
              <Icon className="size-4" />
              {label}
              <span className={"rounded-full px-1.5 text-[11px] tabular-nums " + (active ? "bg-background/20" : "bg-muted")}>{n}</span>
            </button>
          );
        })}
      </div>

      {segRows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No {segment.toLowerCase()} data for {city} yet. Add rows to real_estate/data/localities.csv and re-export.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Median rate" value={inr(stats.median)} note={`per ${unitLabel(unit)}, range midpoint`} />
            <Stat label="Avg YoY" value={stats.avgYoy === null ? "n/a" : `${stats.avgYoy > 0 ? "+" : ""}${stats.avgYoy.toFixed(1)}%`} note={stats.yoyCount ? `${stats.yoyCount} of ${stats.count} localities report it` : "no source reports YoY yet"} />
            <Stat label="Priciest" value={stats.top?.locality ?? "—"} note={stats.top ? `${inr(mid(stats.top))} / ${unitLabel(unit)}` : undefined} />
            <Stat label="Most affordable" value={stats.cheapest?.locality ?? "—"} note={stats.cheapest ? `${inr(mid(stats.cheapest))} / ${unitLabel(unit)}` : undefined} />
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

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold tracking-tight">Price range by locality</CardTitle>
              <CardDescription className="text-xs">
                Bar spans low to high asking rate per {unitLabel(unit)}; the dot is the midpoint. Tap a locality for details.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-40 flex-1 sm:max-w-60">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="re-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search locality"
                    className="h-8 pl-8 text-sm"
                    aria-label="Search locality"
                  />
                </div>
                <Toggle label="Sort" options={SORTS} value={sort} onChange={setSort} />
                <Toggle label="Metro" options={METRO_FILTERS} value={metroFilter} onChange={setMetroFilter} />
              </div>
              <MetroLegend />
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Zone">
                {zones.map((z) => (
                  <button
                    key={z}
                    type="button"
                    aria-pressed={zone === z}
                    onClick={() => setZone(z)}
                    className={
                      "rounded-full border px-2.5 py-0.5 text-xs transition-colors " +
                      (zone === z ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    {z}
                  </button>
                ))}
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
                              {hasMetro(r.metro) && (
                                <span className={METRO_STYLE[r.metro.status].text}> · {r.metro.line}</span>
                              )}
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
                                {detail.price_low === detail.price_high
                                  ? `${inr(detail.price_low)} / ${unitLabel(detail.unit)}`
                                  : `${inr(detail.price_low)} – ${inr(detail.price_high)} / ${unitLabel(detail.unit)}`}
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
                                <span className="font-normal text-muted-foreground"> for {defaultArea.toLocaleString("en-IN")} {unitLabel(detail.unit)}</span>
                              </div>
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
                            <div>
                              <div className="text-muted-foreground">Source · as of {formatDate(detail.as_of)}</div>
                              <a href={detail.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline">
                                {detail.source}
                                <ExternalLink className="size-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                Scale 0 – {inr(scaleMax)} per {unitLabel(unit)}. Amber = estimate, guidance value or developer quote.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold tracking-tight">
                <Wallet className="size-4" /> What fits my budget
              </CardTitle>
              <CardDescription className="text-xs">
                Localities in {city} where the low end of the range fits, for the size you enter.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor="re-budget">
                  Budget (₹ lakh)
                  <Input id="re-budget" inputMode="decimal" value={budgetLakh} onChange={(e) => setBudgetLakh(e.target.value)} className="h-8 w-32 text-sm tabular-nums" />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground" htmlFor="re-area">
                  Size ({unitLabel(unit)}{segment === "Plots" ? "" : " built-up"})
                  <Input id="re-area" inputMode="numeric" value={area} placeholder={String(defaultArea)} onChange={(e) => setArea(e.target.value)} className="h-8 w-32 text-sm tabular-nums" />
                </label>
                <p className="pb-1.5 text-xs text-muted-foreground">
                  {budget > 0 ? `${fits.length} of ${segRows.length} localities` : "Enter a budget"}
                </p>
              </div>
              {budget > 0 && fits.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing fits yet. Try a smaller size or a bigger budget.</p>
              )}
              {fits.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="pb-2 font-medium">Locality</th>
                        <th className="pb-2 text-right font-medium">Estimated cost</th>
                        <th className="pb-2 text-right font-medium">Headroom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fits.map(({ r, low, high }) => (
                        <tr key={r.locality} className="border-t">
                          <td className="py-2">
                            <div className="flex items-center gap-1.5 font-medium">
                              {r.locality}
                              <MetroIcon metro={r.metro} />
                            </div>
                            <div className="text-xs text-muted-foreground">{r.zone}</div>
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {low === high ? lakhOrCrore(low) : `${lakhOrCrore(low)} – ${lakhOrCrore(high)}`}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {high <= budget ? (
                              <span className="text-emerald-600 dark:text-emerald-400">Whole range fits</span>
                            ) : (
                              <span className="text-amber-700 dark:text-amber-300">Low end only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">Asking price only. Add stamp duty and registration (roughly 6–8% in both states), GST on under-construction homes, and interiors.</p>
            </CardContent>
          </Card>
        </>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold tracking-tight">Hyderabad vs Bangalore</CardTitle>
            <CardDescription className="text-xs">Median midpoint per sq ft, by segment (Hyderabad plots converted from sq yd). Each city tracks different localities, so treat this as a rough guide.</CardDescription>
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
                {DATA.compared ? "No locality crossed the threshold." : `Baseline saved on ${formatDate(DATA.snapshot)}. The weekly job sends Telegram alerts from the next snapshot.`}
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
                  <td className="py-2 pr-3 whitespace-nowrap">{f.cadence}</td>
                  <td className="py-2">{f.use_for}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
