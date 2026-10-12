import { route } from "@/server/http";
import { updateProfile } from "@/server/handlers/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PUT = route(updateProfile);
