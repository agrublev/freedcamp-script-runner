import React, { PureComponent, Component } from "react";
import { Color, Box, StdinContext } from "ink";
import Table from "./Table";

const data = [
    ["Sosa Saunders", "male", 17, "sosa.saunders@mail.com"],
    ["Sass6osa Saunders", "male", 17, "sosa.saunders@mail.com"],
    ["Sosa 62626Saunders", "male", 17, "sosa.saunders@mail.com"]
];
const columCount = data[0].length - 1;
const rowCount = data.length - 1;

const ARROW_UP = "\u001B[A";
const ARROW_DOWN = "\u001B[B";
const ARROW_LEFT = "\u001B[D";
const ARROW_RIGHT = "\u001B[C";
const ENTER = "\r";
class Counter extends Component {
    constructor() {
        super();
        console.clear();

        this.state = {
            i: 0,
            active: [0, 0]
        };
    }
    handleInput = data => {
        const s = String(data);
        let [rowA, columnA] = this.state.active;

        if (s === ARROW_DOWN) {
            if (rowA < rowCount) {
                rowA++;
            } else {
                rowA = 0;
            }
            this.setState({ active: [rowA, columnA] });
        }
        if (s === ARROW_UP) {
            if (rowA !== 0) {
                rowA--;
            } else {
                rowA = rowCount;
            }
            this.setState({ active: [rowA, columnA] });
        }
        if (s === ARROW_LEFT) {
            if (columnA !== 0) {
                columnA--;
            } else {
                columnA = columCount;
            }
            this.setState({ active: [rowA, columnA] });
        }
        if (s === ARROW_RIGHT) {
            if (columnA < columCount) {
                columnA++;
            } else {
                columnA = 0;
            }
            this.setState({ active: [rowA, columnA] });
        }
        if (s === ENTER) {
            console.info("ENTER)");
        }
    };
    handleSelect = item => {
        console.log(item);
    };
    componentDidMount() {
        const { stdin, setRawMode } = this.props;

        setRawMode(true);
        stdin.on("data", this.handleInput);
    }
    render() {
        return (
            <Box flexDirection={"column"}>
                <Table
                    cell={({ children, cellData }) => {
                        const { row, column } = cellData;
                        // console.info("Console --- cellData.i", row, column);
                        const [rowA, columnA] = this.state.active;
                        let isActive = row + "_" + column === rowA + "_" + columnA;
                        return (
                            <Box paddingRight={1}>
                                <Color
                                    hex={isActive ? "#1cff9a" : "#FFF"}
                                    bgHex={isActive ? "#0087ff" : "#000"}
                                >
                                    {children[1]}
                                </Color>
                            </Box>
                        );
                    }}
                    data={data}
                />
                <Box width={32} margin={1}>
                    <Box width={5} height={5} marginRight={5}>
                        <Color bgHex="#f00">Hey theasdre</Color>
                    </Box>
                    <Box width={5} marginLeft={5}>
                        <Color hex="#000000" bgHex="#FFFFFF">
                            Hey theasdre
                        </Color>
                    </Box>
                </Box>
            </Box>
        );
    }
}

export default class Keyselect extends PureComponent {
    render() {
        return (
            <StdinContext.Consumer>
                {({ stdin, setRawMode }) => (
                    <Counter {...this.props} stdin={stdin} setRawMode={setRawMode} />
                )}
            </StdinContext.Consumer>
        );
    }
}

// render(<Keyselect />);
