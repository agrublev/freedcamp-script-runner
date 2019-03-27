require("simple-git")()
    .add("./*")
    .commit("TST")
    // .addRemote("origin", "some-repo-url")
    .push(["-u"], () => console.log("done"));
