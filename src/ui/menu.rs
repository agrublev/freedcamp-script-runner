//! Port of `lib/ui/PluginPicker.js` — the command menu shown by bare `fsr`.

use super::*;

#[derive(Debug, Clone, PartialEq)]
pub struct MenuItem {
    pub name: String,
    pub message: String,
}

/// index.js COMMANDS with `menu: true`, in order (plugins are appended by JS).
pub const MENU: &[(&str, &str)] = &[
    (
        "start",
        "Choose a category then a task to run interactively",
    ),
    ("scripts", "Choose a script from package.json"),
    ("list", "Select any task with text autocompletion"),
    ("run", "Run a specific task by name"),
    (
        "upgrade",
        "Upgrade all packages except those listed in 'ignore-upgrade'",
    ),
    ("bump", "Bump the version in package.json and beautify it"),
    ("run-s", "Run a set of tasks sequentially"),
    ("run-p", "Run tasks in parallel"),
    (
        "encryption",
        "Encrypt or decrypt secret files interactively",
    ),
    (
        "generate",
        "Generate a sample fscripts.md from package.json",
    ),
    ("toc", "Regenerate the Table of Contents in fscripts.md"),
    (
        "toc-file",
        "Pick a markdown file and generate its Table of Contents",
    ),
    ("doctor", "Run diagnostics and check system health"),
    (
        "plugins",
        "List all installed plugins (built-in and npm fscr-plugin-*)",
    ),
    ("completion", "Manage shell tab completions"),
    (
        "greet",
        "Install a shell greeting that reminds you to use yarn fsr when fscripts.md is present",
    ),
];

pub fn default_items() -> Vec<MenuItem> {
    MENU.iter()
        .map(|(n, m)| MenuItem {
            name: n.to_string(),
            message: m.to_string(),
        })
        .collect()
}

pub struct Menu {
    pub items: Vec<MenuItem>,
    pub idx: usize,
    scroll: usize,
}

impl Menu {
    pub fn new(items: Vec<MenuItem>) -> Self {
        Menu {
            items,
            idx: 0,
            scroll: 0,
        }
    }
    fn box_width(cols: u16) -> u16 {
        // colWidth * 2 + 4 with colWidth = floor(cols / 2) - 6
        ((cols / 2) as i32 - 6).max(0) as u16 * 2 + 4
    }
    /// Rows for one bordered item box.
    fn item_rows(&self, i: usize, w: u16) -> Vec<Row> {
        let it = &self.items[i];
        let sel = i == self.idx;
        let (tl, tr, bl, br, h, v) = if sel {
            ('╭', '╮', '╰', '╯', '─', '│')
        } else {
            ('┌', '┐', '└', '┘', '─', '│')
        };
        let bs = Style::new().fg(if sel { rgb(0x9F76FB) } else { rgb(0x202E44) });
        let inner = w.saturating_sub(4) as usize;
        let name = clip(&it.name, inner);
        let mx = width(&name) + 2;
        let msg = wrap(&it.message, inner.saturating_sub(mx).max(1));
        let ns = Style::new()
            .fg(if sel { rgb(0xA2ED5F) } else { rgb(0x16CCDB) })
            .add_modifier(Modifier::BOLD);
        let ms = dim().fg(rgb(0xC1C0C4)).add_modifier(Modifier::ITALIC);
        let edge = |l: char, r: char| {
            Row::blank().push(
                0,
                format!(
                    "{l}{}{r}",
                    h.to_string().repeat(w.saturating_sub(2) as usize)
                ),
                bs,
            )
        };
        let mut rows = vec![edge(tl, tr)];
        for (n, line) in msg.iter().enumerate() {
            let mut r = Row::blank().push(0, v.to_string(), bs).push(
                w.saturating_sub(1),
                v.to_string(),
                bs,
            );
            if n == 0 {
                r = r.push(2, &name, ns);
            }
            rows.push(r.push(2 + mx as u16, line, ms));
        }
        rows.push(edge(bl, br));
        rows
    }
    fn geometry(area: Rect) -> (Rect, u16, u16) {
        let c = Rect::new(
            area.x + 2,
            area.y + 1,
            area.width.saturating_sub(4),
            area.height.saturating_sub(2),
        );
        (c, c.y + 4, c.height.saturating_sub(4 + 2))
    }
    fn layout(&self, w: u16) -> Vec<(usize, Vec<Row>)> {
        let mut top = 0;
        (0..self.items.len())
            .map(|i| {
                let r = self.item_rows(i, w);
                let t = top;
                top += r.len();
                (t, r)
            })
            .collect()
    }
}

impl Picker for Menu {
    type Out = String;

    fn handle(&mut self, input: Input, area: Rect) -> Option<Option<String>> {
        let n = self.items.len();
        if n == 0 {
            return Some(None);
        }
        match input {
            Input::Down | Input::ScrollDown => self.idx = (self.idx + 1) % n,
            Input::Up | Input::ScrollUp => self.idx = (self.idx + n - 1) % n,
            Input::Enter => return Some(Some(self.items[self.idx].name.clone())),
            Input::Esc | Input::CtrlC => return Some(None),
            Input::Click(row) => {
                let (_, ly, lh) = Self::geometry(area);
                if row >= ly && row < ly + lh {
                    let cr = (row - ly) as usize + self.scroll;
                    let w = Self::box_width(area.width);
                    if let Some((i, _)) = self
                        .layout(w)
                        .iter()
                        .enumerate()
                        .find(|(_, (t, r))| cr >= *t && cr < t + r.len())
                    {
                        return Some(Some(self.items[i].name.clone()));
                    }
                }
            }
            _ => {}
        }
        None
    }

    fn render(&mut self, area: Rect, buf: &mut Buffer) {
        if area.width < 24 || area.height < 10 {
            return;
        }
        let c = frame(area, buf, rgb(0xCECFCF));
        header(
            buf,
            c.x,
            c.y,
            c.width,
            3,
            "FSR Commands",
            "Esc: cancel ",
            dim(),
            rgb(0x233866),
        );
        let div = (area.width as usize).saturating_sub(4).max(20);
        divider(buf, c.x, c.y + 3, c.width, div);
        let (_, ly, lh) = Self::geometry(area);
        let w = Self::box_width(area.width).min(c.width);
        let lay = self.layout(w);
        if let Some((t, r)) = lay.get(self.idx) {
            self.scroll = scroll_into_view(self.scroll, *t, r.len(), lh as usize);
        }
        let mut y = 0;
        for (_, rows) in &lay {
            for r in rows {
                if y >= self.scroll && y < self.scroll + lh as usize {
                    r.draw(buf, c.x, ly + (y - self.scroll) as u16, w);
                }
                y += 1;
            }
        }
        let fy = c.y + c.height - 1;
        divider(buf, c.x, fy - 1, c.width, div);
        let mut f = gap_row(&[
            ("↑↓ navigate ", dim()),
            (
                "↵",
                Style::new().fg(GREEN_BRIGHT).add_modifier(Modifier::BOLD),
            ),
            (" select ", dim()),
            ("mouse", Style::new().fg(YELLOW_BRIGHT)),
            (" click", dim()),
        ]);
        f.bg = Some(rgb(0x1A1B1C));
        f.draw(buf, c.x, fy, c.width);
    }
}
