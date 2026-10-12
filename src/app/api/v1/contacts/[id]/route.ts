import { route } from "@/server/http";
import { deleteContact, getContact } from "@/server/handlers/contacts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = route(getContact);
export const DELETE = route(deleteContact);
