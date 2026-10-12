import { route } from "@/server/http";
import { getWithdrawalStats } from "@/server/handlers/withdrawals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getWithdrawalStats);
