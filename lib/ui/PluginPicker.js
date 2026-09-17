import { useRef, useState, useEffect } from "react";
import {
    Box,
    Text,
    useInput,
    useApp,
    useWindowSize,
    useStdin,
    useStdout,
    measureElement
} from "ink";
import { ScrollList } from "ink-scroll-list";

function mouseClick(input) {
    if (typeof input !== "string") return null;

    // Ink strips the ESC prefix from CSI input. Consume all mouse reports;
    // ignored wheel/release reports must not be treated as keyboard text.
    const sgr = input.match(/(?:\u001b)?\[<(\d+);(\d+);(\d+)([mM])/);
    if (sgr) {
        const button = Number(sgr[1]);
        return {
            row: Number(sgr[3]),
            primaryPress: sgr[4] === "M" && (button & 3) === 0 && !(button & 32) && !(button & 64)
        };
    }

    const legacy = input.match(/(?:\u001b)?\[M([\s\S]{3})/);
    if (legacy) {
        const button = legacy[1].charCodeAt(0) - 32;
        return {
            row: legacy[1].charCodeAt(2) - 32,
            primaryPress: (button & 3) === 0 && !(button & 32) && !(button & 64)
        };
    }

    return null;
}

function itemAtRow(items, row, listRef, viewportRef) {
    if (!listRef.current || !viewportRef.current) return null;

    const viewport = measureElement(viewportRef.current);
    const scrollOffset = listRef.current.getScrollOffset?.() || 0;
    const contentRow = row - 1 - viewport.y + scrollOffset;

    for (let i = 0; i < items.length; i++) {
        const position = listRef.current.getItemPosition?.(i);
        if (
            position &&
            position.height > 0 &&
            contentRow >= position.top &&
            contentRow < position.top + position.height
        ) {
            return items[i];
        }
    }

    return null;
}

export default function PluginPicker({ items, onSelect, onCancel }) {
    const { exit } = useApp();
    const { rows, columns } = useWindowSize();
    const { stdin } = useStdin();
    const { stdout } = useStdout();
    const listRef = useRef(null);
    const viewportRef = useRef(null);

    const [idx, setIdx] = useState(0);
    const colWidth = Math.floor((columns || 80) / 2) - 6;
    const dividerLen = Math.max(20, (columns || 80) - 4);
    const listHeight = Math.max(4, rows - 8);

    useEffect(() => {
        const onResize = () => listRef.current?.remeasure();
        process.stdout.on("resize", onResize);
        return () => process.stdout.off("resize", onResize);
    }, []);

    useEffect(() => {
        if (!stdin?.isTTY || !stdout?.isTTY) return;

        stdout.write("\u001b[?1000h\u001b[?1006h");
        return () => stdout.write("\u001b[?1000l\u001b[?1006l");
    }, [stdin, stdout]);

    useInput((input, key) => {
        const click = mouseClick(input);
        if (click) {
            if (!click.primaryPress) return;

            const item = itemAtRow(items, click.row, listRef, viewportRef);
            if (item) {
                onSelect(item);
                exit();
            }
            return;
        }

        if (key.downArrow) setIdx((i) => (i + 1) % items.length);
        else if (key.upArrow)
            setIdx((i) => (i - 1 + items.length) % items.length);
        else if (key.return) {
            const item = items[idx];
            if (item) {
                onSelect(item);
                exit();
            }
        } else if (key.escape) {
            onCancel?.();
            exit();
        }
    });

    return (
        <Box
            height={rows}
            flexDirection="column"
            borderStyle="round"
            borderColor="#CECFCF"
            paddingX={1}
        >
            <Box
                justifyContent="space-between"
                paddingY={1}
                backgroundColor={"#233866"}
                borderBottomColor={"#000000"}
            >
                <Text bold color="#FFFFFF">
                    &nbsp;  FSR Commands
                </Text>
                <Text dimColor>Esc: cancel </Text>
            </Box>
            <Text color="cyan" dimColor>
                {"─".repeat(dividerLen)}
            </Text>
            <Box ref={viewportRef} flexGrow={1} height={listHeight}>
                <ScrollList ref={listRef} selectedIndex={idx} height={listHeight}>
                    {items.map((item, i) => {
                        const isSel = i === idx;
                        return (
                            <Box
                                key={item.name}
                                flexDirection="row"
                                alignItems="center"
                                borderStyle={isSel ? "round" : "single"}
                                borderColor={isSel ? "#9F76FB" : "#202E44"}
                                paddingX={1}
                                width={colWidth * 2 + 4}
                            >
                                <Box marginRight={2}>
                                    <Text bold color={isSel ? "#A2ED5F" : "#16CCDB"}>
                                        {item.name}
                                    </Text>
                                </Box>
                                <Box flexShrink={1}>
                                    <Text italic dimColor color={"#C1C0C4"} wrap="wrap">
                                        {item.message}
                                    </Text>
                                </Box>
                            </Box>
                        );
                    })}
                </ScrollList>
            </Box>
            <Text color="cyan" dimColor>
                {"─".repeat(dividerLen)}
            </Text>
            <Box gap={1} backgroundColor={"#1A1B1C"}>
                <Text dimColor>↑↓ navigate </Text>
                <Text color="greenBright" bold>
                    ↵
                </Text>
                <Text dimColor> select </Text>
                <Text color="yellowBright">mouse</Text>
                <Text dimColor> click</Text>
            </Box>
        </Box>
    );
}
