import React from "react";
import { render } from "ink";
import TaskPicker from "./ui/TaskPicker.js";
import PluginPicker from "./ui/PluginPicker.js";

const taskList = (FcScripts, recentTaskOptions) => {
    return new Promise((resolve) => {
        let result = null;
        const { waitUntilExit } = render(
            React.createElement(TaskPicker, {
                FcScripts,
                recentTaskOptions,
                onSelect: (val) => {
                    result = val;
                }
            })
        );
        // Ink restores stdin/stdout during unmount.  Do not hand the terminal
        // to a follow-up interactive command (for example `toc-file`, which
        // starts fc-filepick) in the same turn that Ink reports its exit:
        // doing so can make the second prompt inherit Ink's raw-mode state and
        // immediately terminate.  Yield one macrotask so all teardown effects
        // have completed before the caller starts another prompt.
        waitUntilExit().then(() => {
            setImmediate(() => resolve(result));
        });
    });
};

export const selectPlugin = (items) => {
    return new Promise((resolve) => {
        let result = null;
        const { waitUntilExit } = render(
            React.createElement(PluginPicker, {
                items,
                onSelect: (item) => {
                    result = item.name;
                },
                onCancel: () => {
                    result = null;
                }
            })
        );
        // See taskList() above: yield a macrotask after Ink's teardown so a
        // follow-up interactive prompt (e.g. toc-file's fc-filepick) doesn't
        // inherit Ink's raw-mode state and terminate immediately.
        waitUntilExit().then(() => {
            setImmediate(() => resolve(result));
        });
    });
};

export default taskList;
