import { route } from "@/server/http";
import { getMyLedger } from "@/server/handlers/userLedger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getMyLedger);
