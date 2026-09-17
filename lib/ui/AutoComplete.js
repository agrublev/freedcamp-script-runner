import { useRef, useState, useEffect, useMemo } from "react";
import {
    Box,
    Text,
    Spacer,
    useInput,
    useApp,
    useWindowSize,
    useStdin,
    useStdout,
    measureElement
} from "ink";

function isPrimaryMousePress(button) {
    // 64/65 are wheel events and 32 is motion. Neither should select an item.
    return (button & 3) === 0 && (button & 32) === 0 && (button & 64) === 0;
}

function mouseClick(input) {
    if (typeof input !== "string") return null;

    // Ink removes the ESC prefix from CSI sequences before calling useInput.
    // Return every mouse report (not only clicks), otherwise wheel/release
    // reports such as [<65;21;10M fall through to the text handler and are
    // appended to the search query.
    // SGR mouse reporting: ESC [ < button ; column ; row M/m
    const sgr = input.match(/(?:\u001b)?\[<(\d+);(\d+);(\d+)([mM])/);
    if (sgr) {
        const button = Number(sgr[1]);
        return {
            row: Number(sgr[3]),
            primaryPress: sgr[4] === "M" && isPrimaryMousePress(button)
        };
    }

    // X10 mouse reporting fallback. This is kept for terminals that do not
    // support SGR (the three bytes after ESC[M are button, column, row).
    const legacy = input.match(/(?:\u001b)?\[M([\s\S]{3})/);
    if (legacy) {
        const button = legacy[1].charCodeAt(0) - 32;
        return {
            row: legacy[1].charCodeAt(2) - 32,
            primaryPress: isPrimaryMousePress(button)
        };
    }

    return null;
}

export default function AutoComplete({ items, title, onSelect, onCancel }) {
    const { exit } = useApp();
    const { rows, columns } = useWindowSize();
    const { stdin } = useStdin();
    const { stdout } = useStdout();

    const [query, setQuery] = useState("");
    const [idx, setIdx] = useState(0);
    const [scroll, setScroll] = useState(0);
    const listRef = useRef(null);

    const maxRows = Math.max(1, rows - 14);
    const dividerLen = Math.max(10, (columns || 80) - 4);

    const filtered = useMemo(() => {
        if (!query) return items;
        const q = query.toLowerCase();
        return items.filter(
            (item) =>
                item.label.toLowerCase().includes(q) ||
                (item.sublabel || "").toLowerCase().includes(q)
        );
    }, [items, query]);

    useEffect(() => {
        setIdx((i) => Math.min(i, Math.max(0, filtered.length - 1)));
        setScroll(0);
    }, [filtered.length, query]);

    useEffect(() => {
        setScroll((s) => {
            if (idx < s) return idx;
            if (idx >= s + maxRows) return Math.max(0, idx - maxRows + 1);
            return s;
        });
    }, [idx, maxRows]);

    // Keep mouse support local to this picker. Enabling SGR reporting gives us
    // unambiguous coordinates while preserving normal keyboard input through
    // Ink's useInput hook.
    useEffect(() => {
        if (!stdin?.isTTY || !stdout?.isTTY) return;

        // SGR mouse reporting is enabled on the terminal, but the input is
        // still consumed by Ink's normal input parser below. Listening on the
        // stream directly would put it in flowing mode and steal keystrokes
        // from useInput.
        const enableMouse = "\u001b[?1000h\u001b[?1006h";
        const disableMouse = "\u001b[?1000l\u001b[?1006l";
        stdout.write(enableMouse);
        return () => stdout.write(disableMouse);
    }, [stdin, stdout]);

    useInput((input, key) => {
        const click = mouseClick(input);
        if (click) {
            if (!click.primaryPress) return;

            const viewport = listRef.current
                ? measureElement(listRef.current)
                : null;
            if (!viewport) return;

            // Measurements are zero-based; terminal mouse rows are 1-based.
            // The optional up-arrow occupies the first row in the viewport.
            const arrowRows = scroll > 0 ? 1 : 0;
            const visibleIndex = click.row - 1 - viewport.y - arrowRows;
            const item = filtered[scroll + visibleIndex];
            if (visibleIndex >= 0 && visibleIndex < maxRows && item) {
                onSelect(item);
                exit();
            }
            return;
        }

        if (key.upArrow) setIdx((i) => Math.max(0, i - 1));
        else if (key.downArrow) setIdx((i) => Math.min(filtered.length - 1, i + 1));
        else if (key.return) {
            const item = filtered[idx];
            if (item) {
                onSelect(item);
                exit();
            }
        } else if (key.escape) {
            onCancel?.();
            exit();
        } else if (key.backspace || key.delete) {
            setQuery((q) => q.slice(0, -1));
            setIdx(0);
        } else if (
            input &&
            !key.ctrl &&
            !key.meta &&
            // Escape-prefixed sequences include mouse reports and should never
            // become part of the search query.
            !/[\u0000-\u001f\u007f]/.test(input)
        ) {
            // Ink passes pasted text as one input value. Accepting the whole
            // printable string makes typing and paste behave consistently.
            setQuery((q) => q + input);
            setIdx(0);
        }
    });

    const arrowAbove = scroll > 0;
    const visible = filtered.slice(scroll, scroll + maxRows);
    const hasBelow = filtered.length > scroll + maxRows;

    return (
        <Box height={rows} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
            <Box justifyContent="space-between">
                <Text bold color="cyanBright"> {title || "Choose task"} </Text>
                <Text dimColor>Esc: cancel </Text>
            </Box>
            <Text color="cyan" dimColor>{"─".repeat(dividerLen)}</Text>
            <Box gap={1} marginBottom={1}>
                <Text color="greenBright" bold>›</Text>
                <Text color="white">{query}</Text>
                <Text color="cyan">█</Text>
            </Box>
            <Box ref={listRef} flexDirection="column" flexGrow={1}>
                {arrowAbove && <Box justifyContent="center"><Text dimColor>  ↑  </Text></Box>}
                {visible.map((item, vi) => {
                    const ai = scroll + vi;
                    const isSel = ai === idx;
                    return (
                        <Box key={item.value || vi} gap={1}>
                            <Text color={isSel ? "cyanBright" : "gray"}>{isSel ? "❯" : " "}</Text>
                            <Text bold={isSel} color={isSel ? "cyanBright" : "white"}>{item.label}</Text>
                            {item.sublabel && <Text dimColor color="gray">~  {item.sublabel}</Text>}
                        </Box>
                    );
                })}
                {filtered.length === 0 && (
                    <Box justifyContent="center">
                        <Text color="red" dimColor> no matches </Text>
                    </Box>
                )}
                <Spacer />
                {hasBelow && <Box justifyContent="center"><Text dimColor>  ↓  </Text></Box>}
            </Box>
            <Text color="cyan" dimColor>{"─".repeat(dividerLen)}</Text>
            <Box gap={1}>
                <Text dimColor>↑↓ navigate </Text>
                <Text color="greenBright" bold>↵</Text>
                <Text dimColor> select  type to filter </Text>
                <Text color="yellowBright">mouse</Text>
                <Text dimColor> click to select</Text>
            </Box>
        </Box>
    );
}
