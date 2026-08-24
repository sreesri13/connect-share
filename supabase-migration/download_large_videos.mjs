import fs from "node:fs";
import path from "node:path";

const OLD_URL = "https://kyzazsmsqrqwbjpkqjqm.supabase.co";
const files = [
  "uploads/b04334cb-6eb5-4350-b0bf-3375ca8259a4/1775243347441-8qtj7r.mp4",
  "uploads/b04334cb-6eb5-4350-b0bf-3375ca8259a4/1775442647866-s0xvpo.mp4",
  "uploads/b04334cb-6eb5-4350-b0bf-3375ca8259a4/1775484428160-sic4pg.mp4",
  "uploads/b04334cb-6eb5-4350-b0bf-3375ca8259a4/1775497983239-rmyoco.mp4",
  "uploads/c5ada37c-2af2-4ac0-b4c6-3b739d0c5b4b/1775202902235-jeqlx8.mp4",
  "uploads/c5ada37c-2af2-4ac0-b4c6-3b739d0c5b4b/1775203738935-6al2js.mp4"
];

const destDir = "supabase-migration/large_videos";
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

async function downloadAll() {
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const fileName = path.basename(f);
    const folderName = path.dirname(f).replace(/^uploads\/?/, "");
    const targetFolder = path.join(destDir, folderName);
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });

    const targetPath = path.join(targetFolder, fileName);
    const srcUrl = `${OLD_URL}/storage/v1/object/public/${f}`;

    console.log(`[${i+1}/${files.length}] Downloading ${fileName} (${folderName})...`);
    try {
      const res = await fetch(srcUrl);
      if (!res.ok) {
        console.error(`Failed to download ${f}: HTTP ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(targetPath, buf);
      console.log(`[${i+1}/${files.length}] SAVED: ${targetPath} (${(buf.length / (1024*1024)).toFixed(2)} MB)`);
    } catch (e) {
      console.error(`Error downloading ${f}:`, e.message);
    }
  }
}

downloadAll();
