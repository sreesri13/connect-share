import fs from "node:fs";

const NEW_URL = "https://sizxlgxdawklesbkxmfb.supabase.co";
const csv = fs.readFileSync("supabase-migration/05_storage_files.csv", "utf8").trim().split("\n").slice(1);

async function verify() {
  const results = await Promise.all(
    csv.map(async (line) => {
      const [bucket, ...rest] = line.split(",");
      const fullPath = rest.slice(0, -1).join(",");
      const fileUrl = `${NEW_URL}/storage/v1/object/public/${bucket}/${fullPath}`;
      try {
        const res = await fetch(fileUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
        return { bucket, fullPath, ok: res.ok, status: res.status };
      } catch (e) {
        return { bucket, fullPath, ok: false, status: e.message };
      }
    })
  );

  const present = results.filter(r => r.ok);
  const missing = results.filter(r => !r.ok);

  console.log(`TOTAL_FILES_IN_CSV: ${csv.length}`);
  console.log(`CONFIRMED_PRESENT_IN_NEW_SUPABASE: ${present.length} / ${csv.length}`);
  console.log(`FAILED_TO_UPLOAD: ${missing.length}`);
  if (missing.length > 0) {
    console.log("FAILED_FILES (exceeded default 50MB single-object limit):");
    missing.forEach(m => console.log(` - ${m.bucket}/${m.fullPath} (HTTP ${m.status})`));
  }
}

verify();
