import { route } from "@/server/http";
import { getProfitPercentages } from "@/server/handlers/machines";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getProfitPercentages);
