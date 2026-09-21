// TEMP: prove that after the ink menu exits, the node loop can drain and kill the process
import { selectPlugin } from "./lib/taskList.js";
await selectPlugin([
    { name: "toc-file", message: "Pick a markdown file" },
    { name: "quit", message: "bye" }
]);
console.error("menu done, handles:", process._getActiveHandles().map(h => h.constructor?.name).join(","));
console.error("stdin isTTY:", process.stdin.isTTY, "raw:", process.stdin.isRaw);
const t = setTimeout(() => console.error(">>> STILL ALIVE at +1500ms"), 1500);
t.unref();
console.error("end of script — if nothing refs stdin/stdout the process exits now");
