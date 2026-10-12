import { route } from "@/server/http";
import { getUserWithdrawals } from "@/server/handlers/withdrawals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getUserWithdrawals);
