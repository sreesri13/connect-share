/**
 * 05_copy_storage_files.mjs
 * Copies every file (images, videos, PDFs, avatars, product photos...) from the
 * OLD Supabase storage bucket to the NEW project's bucket.
 *
 * Usage:
 *   npm install @supabase/supabase-js
 *   NEW_SUPABASE_URL=https://sizxlgxdawklesbkxmfb.supabase.co \
 *   NEW_SERVICE_KEY=sb_secret_xxxxxxxx \
 *   node 05_copy_storage_files.mjs
 *
 * The old bucket is public, so no old-project key is needed — files are read
 * over plain HTTPS.
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
  if (error && !/already exists/i.test(error.message)) throw error;
  console.log(`bucket ready: ${bucket}`);
}

let ok = 0;
let failed = 0;

for (const row of rows) {
  const sourceUrl = `${OLD_URL}/storage/v1/object/public/${row.bucket}/${row.name
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    const { error } = await supabase.storage
      .from(row.bucket)
      .upload(row.name, body, { contentType: row.mimetype, upsert: true });
    if (error) throw error;
    ok++;
    console.log(`copied  ${row.bucket}/${row.name} (${body.length} bytes)`);
  } catch (err) {
    failed++;
    console.error(`FAILED  ${row.bucket}/${row.name}: ${err.message}`);
  }
}

console.log(`\nDone. copied=${ok} failed=${failed} total=${rows.length}`);
