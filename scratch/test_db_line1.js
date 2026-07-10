import db from '../api/db.js';

async function test() {
  try {
    console.log("Checking oee_line1_zonec...");
    const [rowsC] = await db.query("SELECT * FROM oee_line1_zonec ORDER BY id DESC LIMIT 5");
    console.log("oee_line1_zonec row count:", rowsC.length);
    if (rowsC.length > 0) {
      console.log("First row:", JSON.stringify(rowsC[0], null, 2));
    }

    console.log("\nChecking downtime_line1_zonec...");
    const [rowsDT] = await db.query("SELECT * FROM downtime_line1_zonec ORDER BY id DESC LIMIT 5");
    console.log("downtime_line1_zonec row count:", rowsDT.length);
    if (rowsDT.length > 0) {
      console.log("First row DT:", JSON.stringify(rowsDT[0], null, 2));
    }
  } catch (err) {
    console.error("Error checking DB:", err);
  } finally {
    process.exit(0);
  }
}

test();
