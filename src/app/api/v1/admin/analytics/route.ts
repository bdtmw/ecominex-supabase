import { route } from "@/server/http";
import { getAnalytics } from "@/server/handlers/adminAnalytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export const GET = route(getAnalytics);
