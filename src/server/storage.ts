import crypto from "node:crypto";
import { admin } from "./supabase";
import { HttpError } from "./http";

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads validated image files to a Supabase Storage bucket and returns their URLs. */
export async function uploadImages(files: File[], bucket: "machine-images" | "deposit-proofs", folder: string, signed = false) {
  const urls: string[] = [];
  for (const file of files) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext) throw new HttpError(400, "Only JPEG, PNG, WebP or GIF images are allowed");
    if (file.size > MAX_BYTES) throw new HttpError(400, "Each image must be 5MB or smaller");

    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await admin().storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type, upsert: false,
    });
    if (error) throw error;

    if (signed) {
      // private bucket: store the path; admins get a signed URL when reading
      urls.push(`${bucket}/${path}`);
    } else {
      urls.push(admin().storage.from(bucket).getPublicUrl(path).data.publicUrl);
    }
  }
  return urls;
}

export async function signDepositProofs(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths) {
    if (p.startsWith("deposit-proofs/")) {
      const { data } = await admin().storage.from("deposit-proofs").createSignedUrl(p.slice("deposit-proofs/".length), 3600);
      out.push(data?.signedUrl || p);
    } else out.push(p);
  }
  return out;
}
