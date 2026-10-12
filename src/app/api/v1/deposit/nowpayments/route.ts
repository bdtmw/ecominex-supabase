import { route } from "@/server/http";
import { createNowPaymentsDeposit } from "@/server/handlers/deposits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(createNowPaymentsDeposit);
