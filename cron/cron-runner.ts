import dotenv from "dotenv";
import cron from "node-cron";
import { connectDB } from "../lib/mongodb.js";
dotenv.config();

import { runMatchingBonus } from "../app/api/CronJobs/Daily/matching-bonus/logic.js";
// import { runDirectSalesBonus } from "../app/api/CronJobs/Daily/direct-sales-bonus/logic.ts";
// import { runInfinityBonus } from "../app/api/CronJobs/Fortnightly/infinity-bonus/logic.ts";

(async () => {
  console.log("⏰ Cron service starting...");
  await connectDB();
  console.log("✅ MongoDB connected. Cron scheduler running...");
})();

const safelyRun = async (fn:any, label:any) => {
  try {
    console.log(`▶️ ${label} started at`, new Date().toISOString());
    await fn();
    console.log(`✅ ${label} finished at`, new Date().toISOString());
  } catch (err) {
    console.error(`❌ Error in ${label}:`, err);
  }
};

cron.schedule("30 18 * * *", () =>
  safelyRun(async () => {
    await runMatchingBonus();
    // await runDirectSalesBonus();
  }, "Daily Cron (12 AM IST)")
);

cron.schedule("30 6 * * *", () =>
  safelyRun(async () => {
    await runMatchingBonus();
    // await runDirectSalesBonus();
  }, "Daily Cron (12 PM IST)")
);

cron.schedule("50 7 * * *", () =>
  safelyRun(async () => {
    await runMatchingBonus();
    // await runDirectSalesBonus();
  }, "Daily Cron (5 PM IST)")
);

// cron.schedule("0 0 1,16 * *", () =>
//   safelyRun(runInfinityBonus, "Infinity Bonus Cron")
// );

console.log("✅ Cron scheduler loaded and waiting for triggers...");
