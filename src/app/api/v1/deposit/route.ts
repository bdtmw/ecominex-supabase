import { route } from "@/server/http";
import { createDeposit, getDeposits } from "@/server/handlers/deposits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(createDeposit);
export const GET = route(getDeposits);
