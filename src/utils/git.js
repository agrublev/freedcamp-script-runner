require("simple-git")()
    .add("./*")
    .commit("TST")
    .push(["-u"], () => console.log("done"));
