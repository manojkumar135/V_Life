import cron from "node-cron";
import { runDirectSalesBonus } from "./logic";
import { runMatchingBonus } from "../matching-bonus/logic";

console.log("⏰ Matching & Direct Sales bonus cron initialized...");

// 12:00 AM IST → 6:30 PM UTC (prev day)
cron.schedule("30 18 * * *", async () => {
  console.log("Running matching bonus at 12:00 AM IST...");
  await runMatchingBonus();

  console.log("Running direct sales bonus at 12:00 AM IST...");
  await runDirectSalesBonus();
});

// 12:00 PM IST → 6:30 AM UTC
cron.schedule("30 6 * * *", async () => {
  console.log("Running matching bonus at 12:00 PM IST...");
  await runMatchingBonus();

  console.log("Running direct sales bonus at 12:00 PM IST...");
  await runDirectSalesBonus();
});

// 5:00 PM IST → 11:30 AM UTC
cron.schedule("30 11 * * *", async () => {
  console.log("Running matching bonus at 5:00 PM IST...");
  await runMatchingBonus();

  console.log("Running direct sales bonus at 5:00 PM IST...");
  await runDirectSalesBonus();
});

console.log("✅ Matching & Direct Sales bonus cron started...");
