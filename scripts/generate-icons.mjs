import sharp from "sharp";
import fs from "fs";
import path from "path";

const input = "src/app/icon.png";
const outDirPublic = "public/icons";

if (!fs.existsSync(outDirPublic)) {
  fs.mkdirSync(outDirPublic, { recursive: true });
}

// 1. Optimize the main icon.png to 512x512 (if larger) or just optimize PNG compression
await sharp(input)
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ quality: 90, compressionLevel: 9 })
  .toFile("src/app/icon-optimized.png");

// Replace the original icon with the optimized one
fs.renameSync("src/app/icon-optimized.png", input);

// 2. Apple touch icon (180x180) - usually solid background, but we'll keep it transparent/png
await sharp(input)
  .resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ quality: 90 })
  .toFile("src/app/apple-icon.png");

// 3. PWA Icons (192x192, 512x512)
await sharp(input)
  .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ quality: 90 })
  .toFile(path.join(outDirPublic, "icon-192.png"));

await sharp(input)
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ quality: 90 })
  .toFile(path.join(outDirPublic, "icon-512.png"));

console.log("Icons generated successfully!");
