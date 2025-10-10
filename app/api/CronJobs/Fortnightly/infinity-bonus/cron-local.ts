import cron from "node-cron";
import { runInfinityBonus } from "./logic";

console.log("⏰ Infinity bonus cron initialized...");

// Run every 15 days at 12:00 AM IST
cron.schedule("30 6 * * *", async () => {
  console.log("Running Infinity Bonus for last 15 days...");
  await runInfinityBonus();
});

console.log("Infinity bonus cron started...");
