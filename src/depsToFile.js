// const getPackagesStats = require("./utils/deps/getPackagesStats.js"); // const Conf = require("conf");
// // const store = new Conf("deps");
// // const filesize = require("filesize");
// // const { writeJson } = require("./utils/index.js");
// // // Loop over all stored values
// // let deps = store.get("deps");
// // writeJson("files.json", deps);
// // Object.keys(deps).forEach(e => {
// //     // console.log(JSON.stringify(deps[e]).length);
// //     let dep = deps[e];
// //     let total = 0;
// //     Object.keys(dep).forEach(z => {
// //         total += parseInt(dep[z].size);
// //     });
// //     console.warn(e, filesize(total, { bits: true }));
// // });
//
// const Conf = require("conf");
// const store = new Conf("deps");
// let deps = store.get("deps");
// // const filesize = require("filesize");
// const { writeJson } = require("./utils/index.js");
// // Loop over all stored values
// writeJson("filesz.json", deps);
// // for (let dep in deps) {
// //     console.warn("-- Console DWE", dep);
// //     console.warn(dep, filesize(getPackagesStats(deps[dep]).size));
// // }
// // console.log(JSON.stringify(deps[e]).length);
// // let dep = deps["parcel"];
// // Object.keys(deps).forEach(z => {
// //     total += parseInt(deps[z].size);
// // });
// // console.warn("parcel", filesize(total, { bits: true }));
// // });
const fetch = require("node-fetch");
// fetch("https://bundlephobia.com/api/size?package=fkit&record=true") //https://registry.npmjs.org/check
//     .then(function(response) {
//         if (response.status >= 400) {
//             throw new Error("Bad response from server");
//         }
//         return response.json();
//     })
//     .then(function(stories) {
//         console.log(stories);
//     });
// fetch("https://bundlephobia.com/api/size?package=parcel&record=true") //https://registry.npmjs.org/check
//     .then(function(response) {
//         if (response.status >= 400) {
//             throw new Error("Bad response from server");
//         }
//         return response.json();
//     })
//     .then(function(stories) {
//         console.log(stories);
//     });
import filesize from "filesize";

async function asyncForEach (array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

const start = async () => {
    await asyncForEach(
        [
            "https://bundlephobia.com/api/size?package=burrito&record=true",
            "https://bundlephobia.com/api/size?package=source-map&record=true",
            "https://bundlephobia.com/api/size?package=commander&record=true",
            "https://bundlephobia.com/api/size?package=tap&record=true",
            "https://bundlephobia.com/api/size?package=uglify-js&record=true",
            "https://bundlephobia.com/api/size?package=traverse&record=true",
            "https://bundlephobia.com/api/size?package=antd&record=true"
        ],
        async num => {
            let ssss = await new Promise(resolve => {
                fetch(num) //https://registry.npmjs.org/check
                .then(function(response) {
                    if (response.status >= 400) {
                        console.warn(response);
                        throw new Error("Bad response from server");
                    }
                    return response.json();
                })
                .then(function(data) {
                    let start = parseInt(data.size);
                    if (data.dependencySizes) {
                        data.dependencySizes.forEach(sz => {
                            start += parseInt(sz.approximateSize);
                        });
                    }
                    console.warn("!!!!" + num, filesize(start, { bits: true, base: 10 }));
                    resolve(data);
                });
            });
            console.log(num, filesize(ssss.size));
        }
    );
    console.log("Done");
};
start();
