// lib/taskList.js
import React from "react";
import { render } from "ink";

// lib/ui/TaskPicker.js
import { useRef, useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  Spacer,
  useInput,
  useApp,
  useWindowSize,
  useStdin,
  useStdout,
  measureElement
} from "ink";
import { ScrollList } from "ink-scroll-list";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

// lib/ui/PluginPicker.js
import { useRef as useRef2, useState as useState2, useEffect as useEffect2 } from "react";
import {
  Box as Box2,
  Text as Text2,
  useInput as useInput2,
  useApp as useApp2,
  useWindowSize as useWindowSize2,
  useStdin as useStdin2,
  useStdout as useStdout2,
  measureElement as measureElement2
} from "ink";
import { ScrollList as ScrollList2 } from "ink-scroll-list";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function mouseClick(input) {
  if (typeof input !== "string") return null;
  const sgr = input.match(/(?:\u001b)?\[<(\d+);(\d+);(\d+)([mM])/);
  if (sgr) {
    const button = Number(sgr[1]);
    return {
      row: Number(sgr[3]),
      primaryPress: sgr[4] === "M" && (button & 3) === 0 && !(button & 32) && !(button & 64)
    };
  }
  const legacy = input.match(/(?:\u001b)?\[M([\s\S]{3})/);
  if (legacy) {
    const button = legacy[1].charCodeAt(0) - 32;
    return {
      row: legacy[1].charCodeAt(2) - 32,
      primaryPress: (button & 3) === 0 && !(button & 32) && !(button & 64)
    };
  }
  return null;
}
function itemAtRow(items, row, listRef, viewportRef) {
  if (!listRef.current || !viewportRef.current) return null;
  const viewport = measureElement2(viewportRef.current);
  const scrollOffset = listRef.current.getScrollOffset?.() || 0;
  const contentRow = row - 1 - viewport.y + scrollOffset;
  for (let i = 0; i < items.length; i++) {
    const position = listRef.current.getItemPosition?.(i);
    if (position && position.height > 0 && contentRow >= position.top && contentRow < position.top + position.height) {
      return items[i];
    }
  }
  return null;
}
function PluginPicker({ items, onSelect, onCancel }) {
  const { exit } = useApp2();
  const { rows, columns } = useWindowSize2();
  const { stdin } = useStdin2();
  const { stdout } = useStdout2();
  const listRef = useRef2(null);
  const viewportRef = useRef2(null);
  const [idx, setIdx] = useState2(0);
  const colWidth = Math.floor((columns || 80) / 2) - 6;
  const dividerLen = Math.max(20, (columns || 80) - 4);
  const listHeight = Math.max(4, rows - 8);
  useEffect2(() => {
    const onResize = () => listRef.current?.remeasure();
    process.stdout.on("resize", onResize);
    return () => process.stdout.off("resize", onResize);
  }, []);
  useEffect2(() => {
    if (!stdin?.isTTY || !stdout?.isTTY) return;
    stdout.write("\x1B[?1000h\x1B[?1006h");
    return () => stdout.write("\x1B[?1000l\x1B[?1006l");
  }, [stdin, stdout]);
  useInput2((input, key) => {
    const click = mouseClick(input);
    if (click) {
      if (!click.primaryPress) return;
      const item = itemAtRow(items, click.row, listRef, viewportRef);
      if (item) {
        onSelect(item);
        exit();
      }
      return;
    }
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
  return /* @__PURE__ */ jsxs2(
    Box2,
    {
      height: rows,
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "#CECFCF",
      paddingX: 1,
      children: [
        /* @__PURE__ */ jsxs2(
          Box2,
          {
            justifyContent: "space-between",
            paddingY: 1,
            backgroundColor: "#233866",
            borderBottomColor: "#000000",
            children: [
              /* @__PURE__ */ jsx2(Text2, { bold: true, color: "#FFFFFF", children: "\xA0 \uE0B1 FSR Commands" }),
              /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: "Esc: cancel " })
            ]
          }
        ),
        /* @__PURE__ */ jsx2(Text2, { color: "cyan", dimColor: true, children: "\u2500".repeat(dividerLen) }),
        /* @__PURE__ */ jsx2(Box2, { ref: viewportRef, flexGrow: 1, height: listHeight, children: /* @__PURE__ */ jsx2(ScrollList2, { ref: listRef, selectedIndex: idx, height: listHeight, children: items.map((item, i) => {
          const isSel = i === idx;
          return /* @__PURE__ */ jsxs2(
            Box2,
            {
              flexDirection: "row",
              alignItems: "center",
              borderStyle: isSel ? "round" : "single",
              borderColor: isSel ? "#9F76FB" : "#202E44",
              paddingX: 1,
              width: colWidth * 2 + 4,
              children: [
                /* @__PURE__ */ jsx2(Box2, { marginRight: 2, children: /* @__PURE__ */ jsx2(Text2, { bold: true, color: isSel ? "#A2ED5F" : "#16CCDB", children: item.name }) }),
                /* @__PURE__ */ jsx2(Box2, { flexShrink: 1, children: /* @__PURE__ */ jsx2(Text2, { italic: true, dimColor: true, color: "#C1C0C4", wrap: "wrap", children: item.message }) })
              ]
            },
            item.name
          );
        }) }) }),
        /* @__PURE__ */ jsx2(Text2, { color: "cyan", dimColor: true, children: "\u2500".repeat(dividerLen) }),
        /* @__PURE__ */ jsxs2(Box2, { gap: 1, backgroundColor: "#1A1B1C", children: [
          /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: "\u2191\u2193 navigate " }),
          /* @__PURE__ */ jsx2(Text2, { color: "greenBright", bold: true, children: "\u21B5" }),
          /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: " select " }),
          /* @__PURE__ */ jsx2(Text2, { color: "yellowBright", children: "mouse" }),
          /* @__PURE__ */ jsx2(Text2, { dimColor: true, children: " click" })
        ] })
      ]
    }
  );
}

// lib/taskList.js
var selectPlugin = (items) => {
  return new Promise((resolve) => {
    let result = null;
    const { waitUntilExit } = render(
      React.createElement(PluginPicker, {
        items,
        onSelect: (item) => {
          result = item.name;
        },
        onCancel: () => {
          result = null;
        }
      })
    );
    waitUntilExit().then(() => resolve(result));
  });
};

// repro-tmp.mjs
await selectPlugin([
  { name: "toc-file", message: "Pick a markdown file" },
  { name: "quit", message: "bye" }
]);
console.error("menu done, handles:", process._getActiveHandles().map((h) => h.constructor?.name).join(","));
console.error("stdin isTTY:", process.stdin.isTTY, "raw:", process.stdin.isRaw);
var t = setTimeout(() => console.error(">>> STILL ALIVE at +1500ms"), 1500);
t.unref();
console.error("end of script \u2014 if nothing refs stdin/stdout the process exits now");
