async function run() {
  console.log("Triggering simulated abandonment lifecycle...");
  const res = await fetch("http://localhost:3000/api/test-carts");
  const json = await res.json();
  console.log("Response status:", res.status);
  console.log("Response data:", JSON.stringify(json, null, 2));
}

run();
