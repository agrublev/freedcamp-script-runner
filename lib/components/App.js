import React, { Component } from "react";
import { render, Color, Box } from "ink";
import Selector from "./lib/components/Selector";
import SelectInput from "ink-select-input";
import chalk from "chalk";
import { Tabs, Tab } from "./lib/components/TabChanger";
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

    handleTabChange = name => {
        this.setState({ activeTab: name });
    };
    render() {
        return (
            <Box>
                <Tabs activeTab={this.state.activeTab} onChange={this.handleTabChange}>
                    <Tab
                        name="foo"
                        // renderName={() => (
                        //     <Box flexDirection={"column"}>
                        //         <Box>
                        //             <Color bold>TITLE</Color>
                        //         </Box>
                        //         <Box>Under</Box>
                        //     </Box>
                        // )}
                    >
                        <Box>Test 52</Box>
                    </Tab>
                    <Tab name="baaar">
                        <Box padding={2}>
                            <Color red bold>
                                HI
                            </Color>
                        </Box>
                    </Tab>
                    <Tab name="baz">Baz</Tab>
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
