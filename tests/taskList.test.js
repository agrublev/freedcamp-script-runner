/**
 * Tests for lib/taskList.js
 *
 * taskList(FcScripts, recentTaskOptions) – renders the ink TaskPicker and
 *   resolves with whatever value its onSelect receives (null if none).
 * selectPlugin(items)                    – renders the ink PluginPicker and
 *   resolves item.name on select, or null on cancel.
 *
 * We mock ink's `render` so it synchronously inspects the element props and
 * fires the appropriate callback (driven per-test), then resolves
 * waitUntilExit. The picker components are mocked to identity so no real ink
 * ever runs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Per-test driver: receives the rendered element's props and decides which
// callback to fire (onSelect / onCancel) and with what value.
const inkMock = vi.hoisted(() => ({ impl: null }));

vi.mock("ink", () => ({
    render: (element) => {
        if (inkMock.impl) {
            inkMock.impl(element.props);
        }
        return { waitUntilExit: () => Promise.resolve() };
    },
}));
vi.mock("../lib/ui/TaskPicker.js", () => ({ default: (props) => props }));
vi.mock("../lib/ui/PluginPicker.js", () => ({ default: (props) => props }));

describe("taskList / selectPlugin", () => {
    let taskList, selectPlugin;

    beforeEach(async () => {
        vi.resetModules();
        inkMock.impl = null;
        const mod = await import("../lib/taskList.js");
        taskList = mod.default;
        selectPlugin = mod.selectPlugin;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("taskList resolves with the value passed to onSelect", async () => {
        inkMock.impl = (props) => props.onSelect("build");

        const result = await taskList({ allTasks: [] }, ["build   ~   yesterday"]);

        expect(result).toBe("build");
    });

    it("taskList resolves null when the picker exits without selecting", async () => {
        // impl left null -> no callback fired -> internal result stays null.
        const result = await taskList({ allTasks: [] }, []);

        expect(result).toBeNull();
    });

    it("selectPlugin resolves the selected item's name", async () => {
        inkMock.impl = (props) => props.onSelect({ name: "git" });

        const result = await selectPlugin([{ name: "git" }, { name: "npm" }]);

        expect(result).toBe("git");
    });

    it("selectPlugin resolves null when cancelled", async () => {
        inkMock.impl = (props) => props.onCancel();

        const result = await selectPlugin([{ name: "git" }]);

        expect(result).toBeNull();
    });
});
