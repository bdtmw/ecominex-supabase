import { route } from "@/server/http";
import { removeUserMachine } from "@/server/handlers/machines";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = route(removeUserMachine);
