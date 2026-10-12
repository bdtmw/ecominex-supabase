import { route } from "@/server/http";
import { requestWithdrawal } from "@/server/handlers/withdrawals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(requestWithdrawal);
