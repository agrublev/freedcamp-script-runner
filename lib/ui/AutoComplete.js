import { useState, useEffect, useMemo } from 'react';
import { Box, Text, Spacer, useInput, useApp, useWindowSize } from 'ink';

export default function AutoComplete({ items, title, onSelect, onCancel }) {
    const { exit } = useApp();
    const { rows, columns } = useWindowSize();

    const [query, setQuery] = useState('');
    const [idx, setIdx] = useState(0);
    const [scroll, setScroll] = useState(0);

    const maxRows = Math.max(1, rows - 14);
    const dividerLen = Math.max(10, (columns || 80) - 4);

    const filtered = useMemo(() => {
        if (!query) return items;
        const q = query.toLowerCase();
        return items.filter(item =>
            item.label.toLowerCase().includes(q) ||
            (item.sublabel || '').toLowerCase().includes(q)
        );
    }, [items, query]);

    useEffect(() => {
        setIdx(i => Math.min(i, Math.max(0, filtered.length - 1)));
        setScroll(0);
    }, [filtered.length]);

    useEffect(() => {
        setScroll(s => {
            if (idx < s) return idx;
            if (idx >= s + maxRows) return Math.max(0, idx - maxRows + 1);
            return s;
        });
    }, [idx, maxRows]);

    useInput((input, key) => {
        if (key.upArrow) setIdx(i => Math.max(0, i - 1));
        else if (key.downArrow) setIdx(i => Math.min(filtered.length - 1, i + 1));
        else if (key.return) {
            const item = filtered[idx];
            if (item) { onSelect(item); exit(); }
        } else if (key.escape) {
            onCancel?.(); exit();
        } else if (key.backspace || key.delete) {
            setQuery(q => q.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta && input.length === 1) {
            setQuery(q => q + input);
        }
    });

    const arrowAbove = scroll > 0;
    const visible = filtered.slice(scroll, scroll + maxRows);
    const hasBelow = filtered.length > scroll + maxRows;

    return (
        <Box height={rows} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
            <Box justifyContent="space-between">
                <Text bold color="cyanBright"> {title || 'Choose task'} </Text>
                <Text dimColor>Esc: cancel </Text>
            </Box>
            <Text color="cyan" dimColor>{'─'.repeat(dividerLen)}</Text>
            <Box gap={1} marginBottom={1}>
                <Text color="greenBright" bold>›</Text>
                <Text color="white">{query}</Text>
                <Text color="cyan">█</Text>
            </Box>
            <Box flexDirection="column" flexGrow={1}>
                {arrowAbove && <Box justifyContent="center"><Text dimColor>  ↑  </Text></Box>}
                {visible.map((item, vi) => {
                    const ai = scroll + vi;
                    const isSel = ai === idx;
                    return (
                        <Box key={item.value || vi} gap={1}>
                            <Text color={isSel ? 'cyanBright' : 'gray'}>{isSel ? '❯' : ' '}</Text>
                            <Text bold={isSel} color={isSel ? 'cyanBright' : 'white'}>{item.label}</Text>
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
            <Text color="cyan" dimColor>{'─'.repeat(dividerLen)}</Text>
            <Box gap={1}>
                <Text dimColor>↑↓ navigate </Text>
                <Text color="greenBright" bold>↵</Text>
                <Text dimColor> select  type to filter</Text>
            </Box>
        </Box>
    );
}
