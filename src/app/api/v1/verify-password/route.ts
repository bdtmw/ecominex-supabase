import { route } from "@/server/http";
import { verifyPassword } from "@/server/handlers/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(verifyPassword);
