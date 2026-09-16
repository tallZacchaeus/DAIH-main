const fs = require("fs");
const path = require("path");
const [, , targetPath, b64Content] = process.argv;
const resolved = path.resolve(targetPath);
fs.mkdirSync(path.dirname(resolved), { recursive: true });
fs.writeFileSync(resolved, Buffer.from(b64Content, "base64").toString("utf8"));
console.log("Saved file: " + resolved);
