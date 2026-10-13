import { route } from "@/server/http";
import { getDepositStatus } from "@/server/handlers/deposits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getDepositStatus);
