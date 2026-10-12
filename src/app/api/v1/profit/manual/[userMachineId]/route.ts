import { route } from "@/server/http";
import { manualProfitUpdate } from "@/server/handlers/machines";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = route(manualProfitUpdate);
