import { route } from "@/server/http";
import { markAsRead } from "@/server/handlers/contacts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PUT = route(markAsRead);
