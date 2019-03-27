const fetch = require("node-fetch");
var Response = require("node-fetch/lib/response");
var Blog = require("node-fetch/lib/response");

const store = require("store");

// // Store current user
// store.set('user', { name:'Marcus' })
//
// // Get current user
// store.get('user')
//
// // Remove current user
// store.remove('user')
//
// // Clear all keys
// store.clearAll()
//
// // Loop over all stored values
// store.each(function(value, key) {
//     console.log(key, '==', value)
// })
const hashstr = s => {
    let hash = 0;
    if (s.length == 0) return hash;
    for (let i = 0; i < s.length; i++) {
        let char = s.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

const cachedFetch = (url, options) => {
    let expiry = 600 * 60; // 5 min default
    if (typeof options === "number") {
        expiry = options;
        options = undefined;
    } else if (typeof options === "object") {
        // I hope you didn't set it to 0 seconds
        expiry = options.seconds || expiry;
    }
    // Use the URL as the cache key to sessionStorage
    let cacheKey = hashstr(url);
    let cached = store.get(cacheKey);
    let whenCached = store.get(cacheKey + ":ts");
    if (cached !== null && whenCached !== null) {
        // it was in sessionStorage! Yay!
        // Even though 'whenCached' is a string, this operation
        // works because the minus sign tries to convert the
        // string to an integer and it will work.
        let age = (Date.now() - whenCached) / 1000;
        if (age < expiry) {
            let response = new Response(new Blob([cached]));
            return Promise.resolve(response);
        } else {
            // We need to clean up this old key
            store.remove(cacheKey);
            store.remove(cacheKey + ":ts");
        }
    }

    return fetch(url, options).then(response => {
        // let's only store in cache if the content-type is
        // JSON or something non-binary
        if (response.status === 200) {
            let ct = response.headers.get("Content-Type");
            if (ct && (ct.match(/application\/json/i) || ct.match(/text\//i))) {
                // There is a .json() instead of .text() but
                // we're going to store it in sessionStorage as
                // string anyway.
                // If we don't clone the response, it will be
                // consumed by the time it's returned. This
                // way we're being un-intrusive.
                response
                    .clone()
                    .text()
                    .then(content => {
                        store.set(cacheKey, content);
                        store.set(cacheKey + ":ts", Date.now());
                    });
            }
        }
        return response;
    });
};

// Default 5 min
// 2 minutes
// cachedFetch("http://httpbin.org/gzip", 2 * 60)
// 1 minute

// cachedFetch('https://httpbin.org/html')
// .then(r => r.text())
// .then(document => {
//   console.log('Document has ' + document.match(/<p>/).length + ' paragraphs')
// })

// cachedFetch('https://httpbin.org/image/png')
// .then(r => r.blob())
// .then(image => {
//   console.log('Image is ' + image.size + ' bytes')
// })
module.exports = cachedFetch;
