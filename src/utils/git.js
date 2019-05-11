require("simple-git")()
    .add("./*")
    .commit("Version")
    .push(["-u"], () => console.log("done"));
