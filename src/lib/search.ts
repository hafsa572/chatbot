import placesData from "../data/places.json";

export interface Place {
  place_name: string;
  district: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  tags: string;
  activities: string;
  best_season: string;
  vibe: string;
  image_url: string;
  tripadvisor_place_id: string;
  tripadvisor_rating: number | null;
  tripadvisor_review_count: number | null;
  tripadvisor_description: string;
  review_1: string;
  review_2: string;
  review_3: string;
  review_4: string;
  tripadvisor_location: string;
  tripadvisor_thumbnail: string;
}

export const places = placesData as Place[];

export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function scorePlace(place: Place, query: string, categoryFilter?: string): number {
  const queryNorm = normalizeText(query);
  const tokens = queryNorm.split(" ").filter((t) => t.length > 1);

  let score = 0.0;

  const name = normalizeText(place.place_name);
  const district = normalizeText(place.district);
  const category = normalizeText(place.category);
  const tags = normalizeText(place.tags);
  const activities = normalizeText(place.activities);
  const vibe = normalizeText(place.vibe);
  const season = normalizeText(place.best_season);
  const location = normalizeText(place.tripadvisor_location);

  if (categoryFilter && categoryFilter !== "All") {
    if (normalizeText(categoryFilter) === category) {
      score += 8.0;
    } else {
      score -= 6.0;
    }
  }

  if (queryNorm) {
    if (name && queryNorm.includes(name)) {
      score += 18.0;
    }
    if (district && queryNorm.includes(district)) {
      score += 6.0;
    }
    if (category && queryNorm.includes(category)) {
      score += 10.0;
    }
    if (vibe && queryNorm.includes(vibe)) {
      score += 3.0;
    }
    if (season && queryNorm.includes(season)) {
      score += 2.0;
    }
    if (location && queryNorm.includes(location)) {
      score += 2.0;
    }

    for (const token of tokens) {
      if (name.includes(token)) score += 7.0;
      if (district.includes(token)) score += 3.0;
      if (category.includes(token)) score += 4.0;
      if (tags.includes(token)) score += 2.0;
      if (activities.includes(token)) score += 2.0;
      if (vibe.includes(token)) score += 1.0;
      if (season.includes(token)) score += 1.0;
      
      const searchBlob = `${name} ${district} ${category} ${tags} ${activities} ${season} ${vibe} ${location}`;
      if (searchBlob.includes(token)) score += 0.4;
    }
  }

  if (place.tripadvisor_rating !== null) {
    score += place.tripadvisor_rating * 1.5;
  }
  if (place.tripadvisor_review_count !== null && place.tripadvisor_review_count > 0) {
    score += Math.min(Math.log1p(place.tripadvisor_review_count) / 2.0, 4.0);
  }

  return score;
}

export function searchPlaces(query: string = "", categoryFilter: string = "All", limit: number = 5): Place[] {
  if (places.length === 0) return [];

  let filtered = places;
  if (categoryFilter && categoryFilter !== "All") {
    const catNorm = normalizeText(categoryFilter);
    filtered = filtered.filter((p) => normalizeText(p.category) === catNorm);
  }

  const safeQuery = query || "";
  if (safeQuery.trim()) {
    const scored = filtered.map((place) => ({
      place,
      score: scorePlace(place, query, categoryFilter),
    }));

    return scored
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const bRating = b.place.tripadvisor_rating || 0;
        const aRating = a.place.tripadvisor_rating || 0;
        if (bRating !== aRating) return bRating - aRating;
        return (b.place.tripadvisor_review_count || 0) - (a.place.tripadvisor_review_count || 0);
      })
      .slice(0, limit)
      .map((item) => item.place);
  } else {
    return [...filtered]
      .sort((a, b) => {
        const bRating = b.tripadvisor_rating || 0;
        const aRating = a.tripadvisor_rating || 0;
        if (bRating !== aRating) return bRating - aRating;
        return (b.tripadvisor_review_count || 0) - (a.tripadvisor_review_count || 0);
      })
      .slice(0, limit);
  }
}

export function getPlaceDetails(name: string): Place | null {
  const query = normalizeText(name);
  if (!query) return null;

  // Exact match
  const exact = places.find((p) => normalizeText(p.place_name) === query);
  if (exact) return exact;

  // Partial match
  const partial = places.find((p) => {
    const n = normalizeText(p.place_name);
    return n.includes(query) || query.includes(n);
  });
  return partial || null;
}
