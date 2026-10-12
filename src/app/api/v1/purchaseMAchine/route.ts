import { route } from "@/server/http";
import { purchaseMachine } from "@/server/handlers/money";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(purchaseMachine);
