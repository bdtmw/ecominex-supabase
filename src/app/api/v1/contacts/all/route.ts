import { route } from "@/server/http";
import { getAllContacts } from "@/server/handlers/contacts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getAllContacts);
