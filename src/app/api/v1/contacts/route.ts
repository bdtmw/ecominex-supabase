import { route } from "@/server/http";
import { createContact } from "@/server/handlers/contacts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = route(createContact);
