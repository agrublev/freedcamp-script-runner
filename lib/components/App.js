import React, { Component } from "react";
import { render, Text, Box } from "ink";

// import Selector from "./Selector.js";
// import SelectInput from "ink-select-input";
// import chalk from "chalk";
import { Tabs, Tab } from "./TabChanger.js";
// import { Tabs, Tab } from "ink-tab";

class App extends Component {
    constructor() {
        super();

        this.state = {
            activeTab: "foo",
            i: 0,
            active: [0, 0]
        };
    }

    handleTabChange = (name) => {
        this.setState({ activeTab: name });
    };
    render() {
        return (
            <Box>
                <Tabs activeTab={this.state.activeTab} onChange={this.handleTabChange}>
                    <Tab name="foo">
                        <Box>
                            <Text>Test 52</Text>
                        </Box>
                    </Tab>
                    <Tab name="baaar">
                        <Box padding={2}>
                            <Text color="red" bold>
                                HI
                            </Text>
                        </Box>
                    </Tab>
                    <Tab name="baz">
                        <Text>Baz</Text>
                    </Tab>
                </Tabs>
            </Box>
        );
    }
}

render(<App />);
/**
 <Selector />

 <SelectInput
 items={[
                        {
                            label: `${chalk.bold.green("Test")}
                two four fibe`,
                            value: "test"
                        },
                        { label: "Test2", value: "test2" }
                    ]}
 onSelect={this.handleSelect}
 />
            */
