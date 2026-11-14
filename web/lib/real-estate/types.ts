// Shape of lib/real-estate/data.json, written by
// `python -m real_estate.export_web_data` from the repo root.

export type City = "Hyderabad" | "Bangalore";
export type Segment = "Plots" | "Apartments" | "Villas" | "Independent Houses";
export type Unit = "sqft" | "sqyd";

// operational: station in the locality; near: running line within ~3 km;
// upcoming: under construction; planned: approved or awaiting approval.
export type MetroStatus = "operational" | "near" | "upcoming" | "planned" | "none";

export type MetroInfo = {
  status: MetroStatus;
  line: string;
  station: string;
  note: string;
  source_url: string;
};

export type LocalityRow = {
  city: City;
  segment: Segment;
  locality: string;
  zone: string;
  unit: Unit;
  price_low: number;
  price_high: number;
  yoy_pct: number | null;
  basis: string;
  source: string;
  source_url: string;
  as_of: string; // yyyy-mm-dd
  metro: MetroInfo | null;
};

export type PriceChange = {
  city: City;
  segment: Segment;
  locality: string;
  unit: Unit;
  old_price: number;
  last_price: number;
  change_pct: number;
  triggered: boolean;
};

export type DataFeed = {
  name: string;
  covers: string;
  cadence: string;
  access: string;
  use_for: string;
};

export type RealEstateData = {
  snapshot: string | null;
  compared: { from: string; to: string } | null;
  threshold_pct: number;
  cities: City[];
  segments: Segment[];
  rows: LocalityRow[];
  changes: PriceChange[];
  feeds: DataFeed[];
};
