import { useState, useEffect } from "react";
import { Box, Text, useInput, useApp, useWindowSize } from "ink";

export default function PluginPicker({ items, onSelect, onCancel }) {
    const { exit } = useApp();
    const { rows, columns } = useWindowSize();

    const [idx, setIdx] = useState(0);
    const [scrollRow, setScrollRow] = useState(0);

    const totalGridRows = Math.ceil(items.length / 2);
    const colWidth = Math.floor((columns || 80) / 2) - 3;
    const dividerLen = Math.max(20, (columns || 80) - 4);

    const available = rows - 8;
    const maxFitRows = Math.max(1, Math.floor(available / 3));
    const visibleRows = Math.min(totalGridRows, maxFitRows);
    // Fixed card height so all rows (both columns) are identical in size
    const cardHeight = Math.floor(available / visibleRows);

    const selGridRow = idx < totalGridRows ? idx : idx - totalGridRows;

    useEffect(() => {
        setScrollRow(s => {
            if (selGridRow < s) return selGridRow;
            if (selGridRow >= s + visibleRows) return selGridRow - visibleRows + 1;
            return s;
        });
    }, [selGridRow, visibleRows]);

    useInput((input, key) => {
        if (key.rightArrow) setIdx(i => Math.min(items.length - 1, i + totalGridRows));
        else if (key.leftArrow) setIdx(i => Math.max(0, i - totalGridRows));
        else if (key.downArrow) setIdx(i => Math.min(items.length - 1, i + 1));
        else if (key.upArrow) setIdx(i => Math.max(0, i - 1));
        else if (key.return) {
            const item = items[idx];
            if (item) { onSelect(item); exit(); }
        } else if (key.escape) {
            onCancel?.(); exit();
        }
    });

    const renderCol = (colIdx) =>
        Array.from({ length: visibleRows }, (_, vi) => {
            const gridRow = scrollRow + vi;
            const itemIdx = colIdx === 0 ? gridRow : gridRow + totalGridRows;
            if (gridRow >= totalGridRows || itemIdx >= items.length) return null;
            const item = items[itemIdx];
            const isSel = itemIdx === idx;
            return (
                <Box
                    key={`c${colIdx}-${gridRow}`}
                    height={cardHeight}
                    flexDirection="row"
                    alignItems="center"
                    borderStyle={isSel ? "round" : "single"}
                    borderColor={isSel ? "cyanBright" : "gray"}
                    paddingX={1}
                    width={colWidth}
                >
                    <Box marginRight={2}>
                        <Text bold color={isSel ? "cyanBright" : "greenBright"}>{item.name}</Text>
                    </Box>
                    <Box flexShrink={1}>
                        <Text italic dimColor wrap="wrap">{item.message}</Text>
                    </Box>
                </Box>
            );
        }).filter(Boolean);

    const arrowAbove = scrollRow > 0;
    const arrowBelow = scrollRow + visibleRows < totalGridRows;

    return (
        <Box height={rows} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
            <Box justifyContent="space-between">
                <Text bold color="cyanBright"> FSR Commands </Text>
                <Text dimColor>Esc: cancel </Text>
            </Box>
            <Text color="cyan" dimColor>{"─".repeat(dividerLen)}</Text>
            <Box flexDirection="column" flexGrow={1}>
                {arrowAbove && <Box justifyContent="center"><Text dimColor>  ↑  </Text></Box>}
                <Box flexDirection="row" gap={2}>
                    <Box flexDirection="column" width={colWidth + 2}>{renderCol(0)}</Box>
                    <Box flexDirection="column" width={colWidth + 2}>{renderCol(1)}</Box>
                </Box>
                {arrowBelow && <Box justifyContent="center"><Text dimColor>  ↓  </Text></Box>}
            </Box>
            <Text color="cyan" dimColor>{"─".repeat(dividerLen)}</Text>
            <Box gap={1}>
                <Text dimColor>↑↓ navigate  </Text>
                <Text dimColor>← → switch column  </Text>
                <Text color="greenBright" bold>↵</Text>
                <Text dimColor> select</Text>
            </Box>
        </Box>
    );
}
