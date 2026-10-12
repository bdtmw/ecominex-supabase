import { route } from "@/server/http";
import { deleteUser } from "@/server/handlers/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const DELETE = route(deleteUser);
