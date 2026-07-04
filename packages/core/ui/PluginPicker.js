import { useRef, useState, useEffect } from "react";
import { Box, Text, useInput, useApp, useWindowSize } from "ink";
import { ScrollList } from "ink-scroll-list";

export default function PluginPicker({ items, onSelect, onCancel }) {
    const { exit } = useApp();
    const { rows, columns } = useWindowSize();
    const listRef = useRef(null);

    const [idx, setIdx] = useState(0);
    const colWidth = Math.floor((columns || 80) / 2) - 6;
    const dividerLen = Math.max(20, (columns || 80) - 4);
    const listHeight = Math.max(4, rows - 8);

    useEffect(() => {
        const onResize = () => listRef.current?.remeasure();
        process.stdout.on("resize", onResize);
        return () => process.stdout.off("resize", onResize);
    }, []);

    useInput((input, key) => {
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
            <Box flexGrow={1} height={listHeight}>
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
                <Text dimColor> select</Text>
            </Box>
        </Box>
    );
}
