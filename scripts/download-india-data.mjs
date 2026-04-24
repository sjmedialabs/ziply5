import fs from "fs";
import path from "path";

async function main() {
  console.log("Fetching Indian states...");
  const statesRes = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ country: "India" }),
  });
  const statesData = await statesRes.json();
  const states = statesData.data.states;

  const citiesMap = {};

  console.log(`Found ${states.length} states. Fetching cities for each...`);
  for (const state of states) {
    console.log(`- Fetching cities for ${state.name}...`);
    const citiesRes = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: "India", state: state.name }),
    });
    const citiesData = await citiesRes.json();
    citiesMap[state.name] = citiesData.data || [];
    
    // Brief pause to avoid rate-limiting the free API during download
    await new Promise((r) => setTimeout(r, 250));
  }

  const finalData = { states, cities: citiesMap };
  const outPath = path.join(process.cwd(), "public", "data", "india-locations.json");
  
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(finalData, null, 2));
  
  console.log("✅ Success! All data saved locally to public/data/india-locations.json");
  console.log("You can now safely rely on this file forever.");
}

main();