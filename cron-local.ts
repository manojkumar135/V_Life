import cron from "node-cron";
import { runMatchingBonus } from "./app/api/CronJobs/Daily/matching-bonus/logic";
import { runDirectSalesBonus } from "./app/api/CronJobs/Daily/direct-sales-bonus/logic";
import { runInfinityBonus } from "./app/api/CronJobs/Fortnightly/infinity-bonus/logic";



console.log("⏰ Local cron started...");

// Daily → 3 times a day
cron.schedule("30 18 * * *", async () => {
  console.log("▶️ Daily Cron (12 AM IST)");
  await runMatchingBonus();
  await runDirectSalesBonus();
});

cron.schedule("30 6 * * *", async () => {
  console.log("▶️ Daily Cron (12 PM IST)");
  await runMatchingBonus();
  await runDirectSalesBonus();
});

cron.schedule("50 7 * * *", async () => {
  console.log("▶️ Daily Cron (5 PM IST)");
  await runMatchingBonus();
  await runDirectSalesBonus();
});

// Infinity → every 15 days
cron.schedule("0 0 1,16 * *", async () => {
  console.log("▶️ Infinity Cron Triggered (1st & 16th)");
  await runInfinityBonus();
});

console.log("✅ Local cron scheduler running...");
