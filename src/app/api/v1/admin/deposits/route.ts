import { route } from "@/server/http";
import { adminListDeposits } from "@/server/handlers/deposits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(adminListDeposits);
