// Regenerates tests/rust_fixtures goldens from the JS implementation.
// Usage: (in a dir with marked@18 + markdown-toc@1.2.0 installed and lib/parsers/parse.js copied to ./parse.mjs)
//   node gen-goldens.mjs <repo>/tests/rust_fixtures <repo>/lib/test-files/*.md ...
import fs from "fs"; import path from "path";
import parse from "./parse.mjs";
import tocPkg from "markdown-toc"; const toc = tocPkg.default || tocPkg;
const src = fs.readFileSync("/workspace/freedcamp-script-runner/lib/generators/generateToc.js","utf8");
const body = src.slice(src.indexOf("const stripColor"), src.indexOf("import { writeFile"));
const slugify = new Function(body + "; return slugify;")();
const out = process.argv[2]; fs.mkdirSync(out,{recursive:true});
for (const f of process.argv.slice(3)) {
  const data = fs.readFileSync(f,"utf8");
  const parts = data.split("<!-- end toc -->"); const md = parts.length===2?parts[1]:parts[0];
  const p = parse(md);
  const j = { categories: p.categories.map(c=>({name:c.name, description:c.description, tasks:Object.keys(c.tasks)})),
    allTasks: p.allTasks.map(t=>({name:t.name,description:t.description,script:t.script,lang:t.lang??null,order:t.order,env:t.env,category:t._category})) };
  const tocContent = data===""?"":toc(md,{slugify}).content;
  const newFile = tocContent + "\n<!-- end toc -->\n\n" + md.trim();
  const base = f.replace(/^.*freedcamp-script-runner\//,"").replace(/[\/]/g,"__");
  fs.copyFileSync(f, path.join(out, base + ".md"));
  fs.writeFileSync(path.join(out, base + ".parsed.json"), JSON.stringify(j,null,2)+"\n");
  fs.writeFileSync(path.join(out, base + ".toc.md"), newFile);
}
