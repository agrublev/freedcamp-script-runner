import { useState, useEffect } from 'react';
import { Box, Text, Spacer, useInput, useApp, useWindowSize } from 'ink';

const SEP = '   ~   ';

function parseOpt(opt) {
    const i = opt.indexOf(SEP);
    return i > -1
        ? { label: opt.slice(0, i).trim(), sublabel: opt.slice(i + SEP.length).trim() }
        : { label: opt.trim(), sublabel: '' };
}

function buildMain(FcScripts, recents) {
    const list = [];
    if (recents.length) {
        list.push({ _t: 'section', label: '★  Recent' });
        for (const r of recents) {
            const { label, sublabel } = parseOpt(r);
            list.push({ _t: 'recent', sel: true, label, sublabel, value: label });
        }
        list.push({ _t: 'gap' });
    }
    list.push({ _t: 'section', label: '⬡  Categories' });
    for (const cat of FcScripts.categories) {
        list.push({ _t: 'cat', sel: true, label: cat.name, sublabel: cat.description || '', cat });
    }
    return list;
}

function buildTasks(cat) {
    return Object.entries(cat.tasks).map(([name, task]) => ({
        _t: 'task',
        sel: true,
        label: name,
        sublabel: task.description ? task.description.replace(/\n/g, ' ').trim() : '',
        value: name
    }));
}

function nextSel(list, cur, dir) {
    let i = cur + dir;
    while (i >= 0 && i < list.length) {
        if (list[i].sel) return i;
        i += dir;
    }
    return cur;
}

function firstSel(list) {
    const i = list.findIndex(x => x.sel);
    return i < 0 ? 0 : i;
}

export default function TaskPicker({ FcScripts, recentTaskOptions, onSelect }) {
    const { exit } = useApp();
    const { rows, columns } = useWindowSize();

    const [screen, setScreen] = useState('main');
    const [activeCat, setActiveCat] = useState(null);

    const mainList = buildMain(FcScripts, recentTaskOptions);
    const [mIdx, setMIdx] = useState(() => firstSel(mainList));
    const [mScroll, setMScroll] = useState(0);
    const [tIdx, setTIdx] = useState(0);
    const [tScroll, setTScroll] = useState(0);

    const list = screen === 'main' ? mainList : (activeCat ? buildTasks(activeCat) : []);
    const idx = screen === 'main' ? mIdx : tIdx;
    const setIdx = screen === 'main' ? setMIdx : setTIdx;
    const setScroll = screen === 'main' ? setMScroll : setTScroll;
    const scroll = screen === 'main' ? mScroll : tScroll;

    const maxRows = Math.max(1, rows - 12);
    const dividerLen = Math.max(10, (columns || 80) - 4);

    useEffect(() => {
        setScroll(s => {
            if (idx < s) return idx;
            if (idx >= s + maxRows) return Math.max(0, idx - maxRows + 1);
            return s;
        });
    }, [idx, maxRows]);

    useInput((input, key) => {
        if (key.upArrow) setIdx(c => nextSel(list, c, -1));
        else if (key.downArrow) setIdx(c => nextSel(list, c, 1));
        else if (key.return) {
            const item = list[idx];
            if (!item?.sel) return;
            if (item._t === 'cat') {
                setActiveCat(item.cat);
                setScreen('tasks');
                const tl = buildTasks(item.cat);
                setTIdx(firstSel(tl));
                setTScroll(0);
            } else {
                onSelect(item.value);
                exit();
            }
        } else if (key.escape || key.leftArrow) {
            if (screen === 'tasks') {
                setScreen('main');
            } else {
                onSelect(null);
                exit();
            }
        } else if (input === 'q' && screen === 'main') {
            onSelect(null);
            exit();
        }
    });

    const arrowAbove = scroll > 0;
    const visible = list.slice(scroll, scroll + maxRows);
    const hasBelow = list.length > scroll + maxRows;
    const title = screen === 'main' ? 'FSR Script Runner' : (activeCat?.name || 'Tasks');

    return (
        <Box height={rows} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
            <Box justifyContent="space-between">
                <Text bold color="cyanBright"> {title} </Text>
                {screen === 'tasks'
                    ? <Text color="yellowBright" dimColor>← Esc: back </Text>
                    : <Text dimColor>q: quit </Text>
                }
            </Box>
            <Text color="cyan" dimColor>{'─'.repeat(dividerLen)}</Text>
            <Box flexDirection="column" flexGrow={1}>
                {arrowAbove && <Box justifyContent="center"><Text dimColor>  ↑  </Text></Box>}
                {visible.map((item, vi) => {
                    const ai = scroll + vi;
                    const isSel = ai === idx;

                    if (item._t === 'section') {
                        return (
                            <Box key={`s${vi}`} marginTop={vi > 0 ? 1 : 0}>
                                <Text color="blueBright" bold> {item.label}</Text>
                            </Box>
                        );
                    }
                    if (item._t === 'gap') {
                        return <Box key={`g${vi}`}><Text> </Text></Box>;
                    }

                    const labelColor = isSel ? 'cyanBright'
                        : item._t === 'recent' ? 'yellow'
                        : item._t === 'cat' ? 'greenBright'
                        : 'white';

                    return (
                        <Box key={item.value || vi} gap={1}>
                            <Text color={isSel ? 'cyanBright' : 'gray'}>{isSel ? '❯' : ' '}</Text>
                            <Text bold={isSel} color={labelColor}>{item.label}</Text>
                            {item.sublabel && <Text dimColor color="gray">~  {item.sublabel}</Text>}
                        </Box>
                    );
                })}
                <Spacer />
                {hasBelow && <Box justifyContent="center"><Text dimColor>  ↓  </Text></Box>}
            </Box>
            <Text color="cyan" dimColor>{'─'.repeat(dividerLen)}</Text>
            <Box gap={1}>
                {screen === 'tasks' ? <>
                    <Text dimColor>↑↓ navigate </Text>
                    <Text color="greenBright" bold>↵</Text>
                    <Text dimColor> select </Text>
                    <Text color="yellowBright">← Esc</Text>
                    <Text dimColor> back</Text>
                </> : <>
                    <Text dimColor>↑↓ navigate </Text>
                    <Text color="greenBright" bold>↵</Text>
                    <Text dimColor> select </Text>
                    <Text color="redBright">q</Text>
                    <Text dimColor> quit</Text>
                </>}
            </Box>
        </Box>
    );
}
