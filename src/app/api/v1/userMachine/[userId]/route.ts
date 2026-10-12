import { route } from "@/server/http";
import { getUserMachines } from "@/server/handlers/machines";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getUserMachines);
