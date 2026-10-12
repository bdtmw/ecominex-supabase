import { route } from "@/server/http";
import { resendLoginOtp } from "@/server/handlers/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(resendLoginOtp);
