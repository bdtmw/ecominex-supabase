import { route } from "@/server/http";
import { createMachine, getAllMachines } from "@/server/handlers/machines";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getAllMachines);
export const POST = route(createMachine);
