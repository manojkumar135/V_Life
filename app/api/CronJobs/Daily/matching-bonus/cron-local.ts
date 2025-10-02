import cron from "node-cron";
import { runMatchingBonus } from "./logic";

console.log("⏰ Matching bonus cron initialized...");


// 12:00 AM IST → 6:30 PM UTC (prev day)
cron.schedule("30 18 * * *", async () => {
  console.log("Running matching bonus at 12:00 AM IST...");
  await runMatchingBonus();
});

// 12:00 PM IST → 6:30 AM UTC
cron.schedule("30 6 * * *", async () => {
  console.log("Running matching bonus at 12:00 PM IST...");
  await runMatchingBonus();
});

// 5:00 PM IST → 11:30 AM UTC
cron.schedule("59 15 * * *", async () => {
  console.log("Running matching bonus at 5:00 PM IST...");
  await runMatchingBonus();
});

console.log("Matching bonus cron started...");
