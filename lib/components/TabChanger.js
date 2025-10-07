import React, { PureComponent, Component } from "react";
import { Text, Box, useStdin } from "ink";
// import BBox from "ink-box"; // ink-box v2 not compatible with ink v4

const ARROW_UP = "\u001B[A";
const ARROW_DOWN = "\u001B[B";
const ARROW_LEFT = "\u001B[D";
const ARROW_RIGHT = "\u001B[C";
const TAB_KEY = "\u0009";
const ENTER = "\r";
// const ENTER = "\u000d\n";
class TabsHandler extends Component {
    constructor() {
        super();
        console.clear();

        this.state = {
            i: 0,
            active: [0, 0]
        };
    }
    onKeyChange = data => {
        const s = String(data);
        const { children, onChange, activeTab } = this.props;
        const tabList = children.map((child, key) => child.props.name);
        let curInd = tabList.indexOf(activeTab);

        if (s === ARROW_LEFT) {
            if (curInd > 0) {
                curInd--;
            } else {
                curInd = tabList.length - 1;
            }
            onChange(tabList[curInd]);
        }
        if (s === ARROW_RIGHT || s === TAB_KEY) {
            if (curInd < tabList.length - 1) {
                curInd++;
            } else {
                curInd = 0;
            }
            onChange(tabList[curInd]);
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
        try {
            if (stdin && stdin.isTTY && setRawMode) {
                setRawMode(true);
                stdin.on("data", this.onKeyChange);
            }
        } catch (error) {
            // Raw mode not supported, component will render but won't be interactive
        }
    }
    render() {
        const { children, activeTab } = this.props;
        const tabObj = {};
        children.forEach((child, key) => {
            tabObj[child.props.name] = child;
        });
        let lengthOfChars = Object.keys(tabObj).join(" ").length;
        return (
            <Box flexDirection={"column"}>
                <Box flexDirection={"row"}>
                    {children.map((child, key) => {
                        const { name, renderName } = child.props;

                        return (
                            <Box key={name} flexDirection={"row"}>
                                <Box padding={0.5}>
                                    <Text bgGreen={activeTab === name} black={activeTab === name}>
                                        {renderName
                                            ? renderName()
                                            : name[0].toUpperCase() + name.slice(1)}
                                    </Text>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>
                <Box>
                    <Text>
                        {Array.from({ length: lengthOfChars + children.length })
                            .map(e => "")
                            .join("─")}
                    </Text>
                </Box>
                <Box paddingLeft={0.5}>{tabObj[activeTab].props.children}</Box>
            </Box>
        );
    }
}

export class Tab extends PureComponent {
    render() {
        return <Box><Text>TEST</Text></Box>;
    }
}

export const Tabs = (props) => {
    const { stdin, setRawMode } = useStdin();
    return <TabsHandler {...props} stdin={stdin} setRawMode={setRawMode} />;
};

// render(<Keyselect />);
