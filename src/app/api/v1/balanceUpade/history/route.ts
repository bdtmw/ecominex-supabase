import { route } from "@/server/http";
import { getBalanceHistory } from "@/server/handlers/withdrawals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getBalanceHistory);
