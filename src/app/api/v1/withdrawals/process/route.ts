import { route } from "@/server/http";
import { processWithdrawal } from "@/server/handlers/withdrawals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(processWithdrawal);
