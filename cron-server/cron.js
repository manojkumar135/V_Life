import cron from "node-cron";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const API = process.env.NEXT_PUBLIC_BASE_URL || "https://maverickmoney.in";
// console.log(API)


console.log("⏰ Cron server started...");

async function callDailyCron() {
    try {
        console.log("▶️ Calling Daily Cron API...");
        const res = await axios.get(`${API}/api/CronJobs/Daily`, {
            headers: { "x-cron-secret": process.env.CRON_SECRET }
        });
        console.log("✅ Daily Cron Response:", res.data);
    } catch (err) {
        console.error("❌ Daily Cron API Error:", err.message);
    }
}

async function callFortnightlyCron() {
    try {
        console.log("🔥 Calling Fortnightly Cron API...");
        const res = await axios.get(`${API}/api/CronJobs/Fortnightly`, {
            headers: { "x-cron-secret": process.env.CRON_SECRET }
        });
        console.log("✅ Infinity Cron Response:", res.data);
    } catch (err) {
        console.error("❌ Infinity Cron API Error:", err.message);
    }
}

// 12 AM IST
cron.schedule("0 13 * * *", async () => {
    await callDailyCron();
    await callFortnightlyCron();

}, {
    timezone: "Asia/Kolkata"
});


// 12 AM IST
cron.schedule("0 15 * * *", async () => {
    await callDailyCron();
    await callFortnightlyCron();

}, {
    timezone: "Asia/Kolkata"
});

// 12 PM IST
// cron.schedule("59 23 * * *", async () => {
//     await callDailyCron();
//     await callFortnightlyCron();

// }, {
//     timezone: "Asia/Kolkata"
// });

// 2 PM IST
// cron.schedule("0 14 * * *", async () => {
//     await callDailyCron();
//     await callFortnightlyCron();

// }, {
//     timezone: "Asia/Kolkata"
// });


// 1st & 16th of every month
// cron.schedule("0 0 1,16 * *", async () => {
//     await callFortnightlyCron();
// }, {
//     timezone: "Asia/Kolkata"
// });


// cron.schedule("55 13 * * *", async () => {
//     // await callDailyCron();
//     console.log("✅ console working ");
// }, {
//     timezone: "Asia/Kolkata"
// });


console.log("✅ Cron scheduler running...");
