import { route } from "@/server/http";
import { deleteMachine, getMachine, updateMachine } from "@/server/handlers/machines";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getMachine);
export const PUT = route(updateMachine);
export const DELETE = route(deleteMachine);
