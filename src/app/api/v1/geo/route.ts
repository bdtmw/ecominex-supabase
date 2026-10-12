import { NextRequest } from "next/server";
import { json } from "@/server/http";

export const dynamic = "force-dynamic";

// Visitor's country (ISO 3166-1 alpha-2) from the hosting platform's edge headers.
// Used to pre-select the country on the signup form without calling a third-party API from the browser.
export async function GET(req: NextRequest) {
  const code =
    req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry") || null;
  return json({ countryCode: code && /^[A-Za-z]{2}$/.test(code) ? code.toUpperCase() : null });
}
