import { route } from "@/server/http";
import { getBalance } from "@/server/handlers/money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getBalance);
