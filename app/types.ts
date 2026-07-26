export interface Deal {
  special: string;
  price: number;
  is_exclusive?: boolean;
  days?: string[];
}

export interface Restaurant {
  id: string;
  name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  cuisine: string;
  emoji: string;
  work_friendly: boolean;
  walk_in: boolean;
  wifi: boolean;
  hours: string;
  photo_url: string | null;
  deals: Deal[];
}

// Single source of truth for the homepage query — used by both the initial
// server-side fetch and the client-side focus-refresh, so the two never drift.
// Only includes columns the homepage cards and map actually render.
export const HOMEPAGE_RESTAURANT_SELECT =
  'id, name, neighborhood, lat, lng, cuisine, emoji, work_friendly, walk_in, wifi, hours, photo_url, deals(price, special, is_exclusive, days)';
