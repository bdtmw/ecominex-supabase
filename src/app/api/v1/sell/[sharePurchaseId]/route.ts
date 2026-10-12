import { route } from "@/server/http";
import { sellShares } from "@/server/handlers/money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(sellShares);
