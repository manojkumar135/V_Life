import axios from "axios";

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export async function getSandboxToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (5 min buffer before expiry)
  if (cachedToken && tokenExpiry && now < tokenExpiry - 5 * 60 * 1000) {
    console.log("✅ Using cached Sandbox token");
    return cachedToken;
  }

  console.log("🔄 Generating new Sandbox token...");

  const KEY_ID = process.env.PAN_API_KEY_ID;
  const SECRET_KEY = process.env.PAN_API_SECRET_KEY;

  if (!KEY_ID || !SECRET_KEY) {
    throw new Error("PAN API keys missing");
  }

  const authRes = await axios.post(
    "https://api.sandbox.co.in/authenticate",
    {},
    {
      headers: {
        "x-api-key": KEY_ID,
        "x-api-secret": SECRET_KEY,
        "x-api-version": "1.0",
        "Content-Type": "application/json",
      },
    }
  );

  const token = authRes.data?.data?.access_token;
  if (!token) {
    throw new Error("Token generation failed");
  }

  cachedToken = token;
  tokenExpiry = now + 24 * 60 * 60 * 1000; // 24 hours

  return token;
}

export function clearSandboxToken(): void {
  cachedToken = null;
  tokenExpiry = null;
  console.log("🗑️ Sandbox token cache cleared");
}