import { route } from "@/server/http";
import { updateBalance } from "@/server/handlers/money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(updateBalance);
