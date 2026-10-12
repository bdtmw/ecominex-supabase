import { route } from "@/server/http";
import { nowPaymentsIpn } from "@/server/handlers/deposits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(nowPaymentsIpn);
