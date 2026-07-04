import React from 'react';
import { render } from 'ink';
import TaskPicker from './ui/TaskPicker.js';
import PluginPicker from './ui/PluginPicker.js';

const taskList = (FcScripts, recentTaskOptions) => {
    return new Promise((resolve) => {
        let result = null;
        const { waitUntilExit } = render(
            React.createElement(TaskPicker, {
                FcScripts,
                recentTaskOptions,
                onSelect: (val) => { result = val; }
            })
        );
        waitUntilExit().then(() => resolve(result));
    });
};

export const selectPlugin = (items) => {
    return new Promise((resolve) => {
        let result = null;
        const { waitUntilExit } = render(
            React.createElement(PluginPicker, {
                items,
                onSelect: (item) => { result = item.name; },
                onCancel: () => { result = null; }
            })
        );
        waitUntilExit().then(() => resolve(result));
    });
};

export default taskList;
