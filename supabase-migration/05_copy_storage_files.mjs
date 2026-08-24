/**
 * 05_copy_storage_files.mjs
 * Copies every file (images, videos, PDFs, avatars, product photos...) from the
 * OLD Supabase storage bucket to the NEW project's bucket.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const OLD_URL = process.env.OLD_SUPABASE_URL ?? "https://kyzazsmsqrqwbjpkqjqm.supabase.co";
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_SERVICE_KEY = process.env.NEW_SERVICE_KEY;

if (!NEW_URL || !NEW_SERVICE_KEY) {
  console.error("Set NEW_SUPABASE_URL and NEW_SERVICE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(NEW_URL, NEW_SERVICE_KEY, { auth: { persistSession: false } });

const csvPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "05_storage_files.csv");
const rows = fs
  .readFileSync(csvPath, "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [bucket, ...rest] = line.split(",");
    const mimetype = rest.pop();
    return { bucket, name: rest.join(","), mimetype };
  });

// Make sure the bucket exists and is public (same as the old project).
for (const bucket of new Set(rows.map((r) => r.bucket))) {
  const { error } = await supabase.storage.createBucket(bucket, { public: true });
  if (error && !/already exists/i.test(error.message)) {
    console.warn(`createBucket note: ${error.message}`);
  }
  // Try to update bucket to allow public access
  await supabase.storage.updateBucket(bucket, { public: true });
  console.log(`bucket ready: ${bucket}`);
}

let ok = 0;
let skipped = 0;
let failed = 0;

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const destUrl = `${NEW_URL}/storage/v1/object/public/${row.bucket}/${row.name
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  // Check if destination already has this file
  try {
    const checkRes = await fetch(destUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
    if (checkRes.ok && Number(checkRes.headers.get("content-length")) > 0) {
      skipped++;
      console.log(`[${i + 1}/${rows.length}] ALREADY EXISTS: ${row.bucket}/${row.name}`);
      continue;
    }
  } catch {
    // If check fails, proceed to attempt copy
  }

  const sourceUrl = `${OLD_URL}/storage/v1/object/public/${row.bucket}/${row.name
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  try {
    console.log(`[${i + 1}/${rows.length}] Downloading ${row.bucket}/${row.name}...`);
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`download ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    console.log(`[${i + 1}/${rows.length}] Uploading ${row.bucket}/${row.name} (${body.length} bytes)...`);
    const { error } = await supabase.storage
      .from(row.bucket)
      .upload(row.name, body, { contentType: row.mimetype, upsert: true });
    if (error) throw error;
    ok++;
    console.log(`[${i + 1}/${rows.length}] COPIED ${row.bucket}/${row.name}`);
  } catch (err) {
    failed++;
    console.error(`[${i + 1}/${rows.length}] FAILED ${row.bucket}/${row.name}: ${err.message}`);
  }
}

console.log(`\nDone. copied=${ok} already_existed=${skipped} failed=${failed} total=${rows.length}`);
