import fsrLog from "../utils/console.js";
const registry = new Map();

export const registerHook = (name, fn) => {
    if (!registry.has(name)) registry.set(name, []);
    registry.get(name).push(fn);
};

export const fireHook = async (name, data) => {
    const handlers = registry.get(name) ?? [];
    for (const fn of handlers) {
        try {
            await fn(data);
        } catch (err) {
            fsrLog.error(`[hook:${name}] ${err.message}`);
        }
    }
};
