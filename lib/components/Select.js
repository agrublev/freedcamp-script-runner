import React, { useState } from "react";
import { render, Text, Box, useInput } from "ink";

const items = ["Red", "Green", "Blue", "Yellow", "Magenta", "Cyan"];

function SelectInput() {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useInput((input, key) => {
        if (key.upArrow) {
            setSelectedIndex((previousIndex) =>
                previousIndex === 0 ? items.length - 1 : previousIndex - 1
            );
        }

        if (key.downArrow) {
            setSelectedIndex((previousIndex) =>
                previousIndex === items.length - 1 ? 0 : previousIndex + 1
            );
        }

        if (key.return) {
            process.exit(1);
        }
    });

    return (
        <Box flexDirection="column" aria-role="list">
            <Box
                flexDirection="row"
                borderStyle="single"
                borderBottomColor="white"
                borderTop={false}
                borderLeft={false}
                borderRight={false}
            >
                <Box marginRight={2}>
                    <Text bold>SELECTED COLOR:</Text>
                </Box>
                <Text color={items[selectedIndex].toLowerCase()}>{items[selectedIndex]}</Text>
            </Box>
            <Text>Select a color:</Text>
            {items.map((item, index) => {
                const isSelected = index === selectedIndex;
                const label = isSelected ? `> ${item}` : `  ${item}`;
                const screenReaderLabel = `${index + 1}. ${item}`;

                return (
                    <Box key={item} aria-role="listitem" aria-state={{ selected: isSelected }}>
                        <Text color={isSelected ? "blue" : undefined}>{label}</Text>
                    </Box>
                );
            })}
        </Box>
    );
}

render(<SelectInput />);
