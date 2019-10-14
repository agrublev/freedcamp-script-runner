import React, { Component } from "react";
import { render, Color } from "ink";
import SelectInput from "ink-select-input";
import chalk from "chalk";

class Counter extends Component {
    constructor() {
        super();

        this.state = {
            i: 0
        };
    }

    handleSelect = item => {
        console.log(item);
    };

    render() {
        return (
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
        );
    }
}

render(<Counter />);
