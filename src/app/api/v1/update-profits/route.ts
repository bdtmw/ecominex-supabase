import { route } from "@/server/http";
import { updateAllShareProfits } from "@/server/handlers/money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(updateAllShareProfits);
