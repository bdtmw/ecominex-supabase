import { route } from "@/server/http";
import { getContactStats } from "@/server/handlers/contacts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getContactStats);
