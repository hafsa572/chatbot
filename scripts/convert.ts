import fs from "fs";
import path from "path";
import Papa from "papaparse";

const csvPath = path.join(process.cwd(), "Jk_expand_tripadvisor.csv");
const jsonDir = path.join(process.cwd(), "src", "data");
const jsonPath = path.join(jsonDir, "places.json");

if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found at ${csvPath}`);
  process.exit(1);
}

const csvData = fs.readFileSync(csvPath, "utf8");

const parsed = Papa.parse(csvData, {
  header: true,
  skipEmptyLines: true,
});

if (parsed.errors.length > 0) {
  console.warn("CSV parsing warnings:", parsed.errors);
}

// Clean and normalize rows
const cleanData = parsed.data.map((row: any) => {
  const rating = parseFloat(row.tripadvisor_rating);
  const reviewCount = parseInt(row.tripadvisor_review_count, 10);
  const lat = parseFloat(row.latitude);
  const lng = parseFloat(row.longitude);

  return {
    place_name: (row.place_name || "").trim(),
    district: (row.district || "").trim(),
    category: (row.category || "").trim(),
    latitude: isNaN(lat) ? null : lat,
    longitude: isNaN(lng) ? null : lng,
    tags: (row.tags || "").trim(),
    activities: (row.activities || "").trim(),
    best_season: (row.best_season || "").trim(),
    vibe: (row.vibe || "").trim(),
    image_url: (row.image_url || "").trim(),
    tripadvisor_place_id: (row.tripadvisor_place_id || "").trim(),
    tripadvisor_rating: isNaN(rating) ? null : rating,
    tripadvisor_review_count: isNaN(reviewCount) ? null : reviewCount,
    tripadvisor_description: (row.tripadvisor_description || "").trim(),
    review_1: (row.review_1 || "").trim(),
    review_2: (row.review_2 || "").trim(),
    review_3: (row.review_3 || "").trim(),
    review_4: (row.review_4 || "").trim(),
    tripadvisor_location: (row.tripadvisor_location || "").trim(),
    tripadvisor_thumbnail: (row.tripadvisor_thumbnail || "").trim(),
  };
});

// Ensure target directory exists
if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir, { recursive: true });
}

fs.writeFileSync(jsonPath, JSON.stringify(cleanData, null, 2), "utf8");
console.log(`Successfully converted ${cleanData.length} records to JSON: ${jsonPath}`);
