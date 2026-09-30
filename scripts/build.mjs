import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "src/app/text/transliterate.js",
  "src/app/text/cite.js",
  "src/app/text/chunk.js",
  "src/app/core/store.js",
  "src/app/core/dom.js",
  "src/app/core/router.js",
  "src/app/features/notes.js",
  "src/app/features/progress.js",
  "src/app/features/quiz.js",
  "src/app/features/io.js",
  "src/app/features/search.js",
  "src/app/features/tts.js",
  "src/app/ui/chrome.js",
  "src/app/views/pages.js",
  "src/data/generated/data.js",
  "src/app/main.js"
];

const snapshot = path.join(root, "tools/raw/bilara");
const dataFile = path.join(root, "src/data/generated/data.js");
if (fs.existsSync(snapshot)) {
  execSync("python3 tools/build_content.py", { cwd: root, stdio: "inherit" });
} else if (!fs.existsSync(dataFile)) {
  console.error("ไม่มี snapshot และไม่มี src/data/generated/data.js");
  process.exit(1);
}
for (const file of files) {
  execSync(`node --check ${JSON.stringify(path.join(root, file))}`, { stdio: "inherit" });
}

fs.mkdirSync(path.join(root, ".build"), { recursive: true });
execSync("npx @tailwindcss/cli -i src/styles/input.css -o .build/app.css --minify", { cwd: root, stdio: "inherit" });

const fontDir = path.join(root, "node_modules/@fontsource/sarabun/files");
const faces = [
  ["400", "thai"],
  ["600", "thai"],
  ["700", "thai"],
  ["400", "latin"],
  ["600", "latin"],
  ["700", "latin"],
  ["400", "latin-ext"],
  ["600", "latin-ext"],
  ["700", "latin-ext"]
].map(([weight, subset]) => {
  const file = path.join(fontDir, `sarabun-${subset}-${weight}-normal.woff2`);
  const b64 = fs.readFileSync(file).toString("base64");
  return `@font-face{font-family:Sarabun;font-style:normal;font-weight:${weight};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
}).join("");

const css = faces + fs.readFileSync(path.join(root, ".build/app.css"), "utf8") +
  "body{font-family:Sarabun,'Noto Sans Thai','Leelawadee UI',Thonburi,Tahoma,sans-serif}";
const js = files.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
const html = fs.readFileSync(path.join(root, "src/index.template.html"), "utf8")
  .replace("/*CSS*/", css)
  .replace("/*JS*/", js);
fs.writeFileSync(path.join(root, "tipitaka-study.html"), html);
fs.mkdirSync(path.join(root, "dist"), { recursive: true });
fs.writeFileSync(path.join(root, "dist/index.html"), html);
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const scriptPath = path.join(root, ".build/app.js");
fs.writeFileSync(scriptPath, script);
execSync(`node --check ${JSON.stringify(scriptPath)}`, { stdio: "inherit" });
const size = fs.statSync(path.join(root, "tipitaka-study.html")).size;
if (size > 3 * 1024 * 1024) {
  console.error("ไฟล์ใหญ่เกิน 3 MB:", size);
  process.exit(1);
}
console.log("built", size, "bytes");
