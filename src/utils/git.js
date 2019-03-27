require("simple-git")()
    .add("./*")
    .commit("TST")
    // .addRemote("origin", "some-repo-url")
    .push([], () => console.log("done"));
