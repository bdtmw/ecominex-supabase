import { route } from "@/server/http";
import { me } from "@/server/handlers/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(me);
