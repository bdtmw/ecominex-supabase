import { route } from "@/server/http";
import { profitUpdate } from "@/server/handlers/cron";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = route(profitUpdate);
