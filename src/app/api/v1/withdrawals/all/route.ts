import { route } from "@/server/http";
import { getAllWithdrawals } from "@/server/handlers/withdrawals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getAllWithdrawals);
