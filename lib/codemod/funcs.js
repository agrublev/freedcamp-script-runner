export default (fileInfo, api) => {
    const j = api.jscodeshift;
    return j(fileInfo.source)
        .find(j.FunctionExpression)
        .forEach(path => {
            console.warn("-- Console oa", path.value );
        })
        .toSource();
    // return j(fileInfo.source)
    //     .find(j.CallExpression, {
    //         callee: {
    //             type: "MemberExpression",
    //             object: { type: "Identifier", name: "function" }
    //         }
    //     })
    //     .remove()
    //     .toSource();
    // return api
    //     .jscodeshift(fileInfo.source)
    //     .find(j.CallExpression, {
    //         callee: {
    //             type: "MemberExpression",
    //             object: { type: "Identifier", name: "function" }
    //         }
    //     })
    //     .renameTo("zebra")
    //     .toSource();
};
