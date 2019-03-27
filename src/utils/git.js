require("simple-git")()
    .add("./*")
    .commit("v1.1.20")
    // .addRemote("origin", "some-repo-url")
    .push([], () => console.log("done"));
