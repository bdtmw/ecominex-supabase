import { route } from "@/server/http";
import { assignMachine } from "@/server/handlers/machines";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(assignMachine);
