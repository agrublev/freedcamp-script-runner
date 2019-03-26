const nodeEval = require("node-eval");

(async () => {
    return nodeEval(`
	console.warn("RUNS JSUNS JSUNS JSUNS JSUNS JSUNS JSUNS JS\\n\\nUNS JSUNS JSUNS JSUNS JSUNS JS\\n\\n");
	setTimeout(()=>{console.warn("RUNS JSUNS JSUNS JSUNS JSUNS JSUNS JSUNS JS\\n\\nUNS JSUNS JSUNS JSUNS JSUNS JS\\n\\nJSUNS JSUNS JSUNS JSUNS JSUNS JSUNS JS\\n\\nUNS JSUNS JSUNS JSUNS JSUNS JS\\n\\nJSUNS JSUNS JSUNS JSUNS JSUNS JSUNS JS\\n\\nUNS JSUNS JSUNS JSUNS JSUNS JS\\n\\nJS");},4000);
	console.warn("RUNS JS");
	`);
})();
