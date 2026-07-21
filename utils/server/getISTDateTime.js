// utils/server/getISTDateTime.js
export function getISTDateTime() {
  const now = new Date();

  // dd-mm-yyyy in IST
  const formattedDate = now
    .toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })
    .split("/")
    .join("-");

  // hh:mm:ss AM/PM in IST
  const formattedTime = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return { formattedDate, formattedTime };
}


// 🆕 Converts activated_date ("dd-mm-yyyy") + activated_time ("hh:mm:ss AM/PM") → real Date object
export function istStringsToUTCDate(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;

  const parts = String(dateStr).split("-").map((s) => s.trim());
  if (parts.length !== 3) return null;
  const [day, month, year] =
    parts[0].length === 4 ? [parts[2], parts[1], parts[0]].map(Number) : parts.map(Number);

  const m = String(timeStr).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;

  let hh = Number(m[1]);
  const mm = Number(m[2]);
  const ampm = m[4] ? m[4].toUpperCase() : null;
  if (ampm) {
    if (hh === 12) hh = 0;
    if (ampm === "PM") hh += 12;
  }

  const istMillis = Date.UTC(year, month - 1, day, hh, mm, 0);
  return new Date(istMillis - 5.5 * 60 * 60 * 1000);
}