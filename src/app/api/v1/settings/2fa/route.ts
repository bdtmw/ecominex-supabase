import { route } from "@/server/http";
import { toggleTwoFactor } from "@/server/handlers/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const PATCH = route(toggleTwoFactor);
