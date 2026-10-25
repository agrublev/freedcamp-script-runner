//! Port of `lib/ui/TaskPicker.js` (used by `fsr start`).

use super::*;
use crate::parse::{Category, Parsed};

#[derive(Debug, Clone, PartialEq)]
pub enum Kind {
    Section,
    Gap,
    Recent,
    Task,
    Cat(usize),
}

#[derive(Debug, Clone, PartialEq)]
pub struct Item {
    pub kind: Kind,
    pub label: String,
    pub sublabel: String,
    pub value: String,
    /// Full task description (for Tab-expand).
    pub desc: String,
}

impl Item {
    pub fn sel(&self) -> bool {
        !matches!(self.kind, Kind::Section | Kind::Gap)
    }
    fn plain(kind: Kind, label: &str) -> Self {
        Item {
            kind,
            label: label.into(),
            sublabel: String::new(),
            value: String::new(),
            desc: String::new(),
        }
    }
}

/// `"name   ~   sub"` → (label, sublabel)
pub fn parse_opt(opt: &str) -> (String, String) {
    match opt.split_once("   ~   ") {
        Some((a, b)) => (a.trim().into(), b.trim().into()),
        None => (opt.trim().into(), String::new()),
    }
}

fn task_items(cat: &Category, max_sub: isize) -> Vec<Item> {
    cat.tasks
        .iter()
        .map(|t| {
            let name = t.name.trim().to_string();
            let sub = if t.description.is_empty() {
                String::new()
            } else {
                js_slice_to(
                    t.description.replace('\n', " ").trim(),
                    max_sub - name.chars().count() as isize,
                )
            };
            Item {
                kind: Kind::Task,
                label: name.clone(),
                sublabel: sub,
                value: name,
                desc: t.description.clone(),
            }
        })
        .collect()
}

pub fn build_main(p: &Parsed, recents: &[String], columns: u16) -> Vec<Item> {
    let mut list = Vec::new();
    if !recents.is_empty() {
        list.push(Item::plain(Kind::Section, "  ★ Recent"));
        for r in recents {
            let (label, sublabel) = parse_opt(r);
            list.push(Item {
                kind: Kind::Recent,
                value: label.clone(),
                label,
                sublabel,
                desc: String::new(),
            });
        }
        list.push(Item::plain(Kind::Gap, ""));
    }
    if let Some(root) = p
        .categories
        .iter()
        .find(|c| c.name.is_empty())
        .filter(|c| !c.tasks.is_empty())
    {
        list.push(Item::plain(Kind::Section, "▶  Tasks"));
        list.extend(task_items(root, (columns as isize - 20).max(0)));
        list.push(Item::plain(Kind::Gap, ""));
    }
    let named: Vec<(usize, &Category)> = p
        .categories
        .iter()
        .enumerate()
        .filter(|(_, c)| !c.name.is_empty())
        .collect();
    if !named.is_empty() {
        list.push(Item::plain(Kind::Section, "  ⬡ Categories"));
        for (i, c) in named {
            list.push(Item {
                kind: Kind::Cat(i),
                label: c.name.clone(),
                sublabel: c.description.clone(),
                value: String::new(),
                desc: String::new(),
            });
        }
    }
    list
}

pub fn build_tasks(cat: &Category, columns: u16) -> Vec<Item> {
    task_items(cat, (columns as isize - 15).max(0))
}

pub fn filter_list(list: &[Item], query: &str) -> Vec<Item> {
    if query.is_empty() {
        return list.to_vec();
    }
    let q = query.to_lowercase();
    let mut out = Vec::new();
    let mut section: Option<&Item> = None;
    for it in list {
        if it.kind == Kind::Section {
            section = Some(it);
            continue;
        }
        if !it.sel() {
            continue;
        }
        if it.label.to_lowercase().contains(&q) || it.sublabel.to_lowercase().contains(&q) {
            if let Some(s) = section.take() {
                out.push(s.clone());
            }
            out.push(it.clone());
        }
    }
    out
}

pub fn first_sel(list: &[Item]) -> usize {
    list.iter().position(Item::sel).unwrap_or(0)
}

/// Wrap-around movement skipping sections/gaps.
pub fn next_sel(list: &[Item], cur: usize, dir: isize) -> usize {
    let n = list.len() as isize;
    if n == 0 {
        return cur;
    }
    let mut i = cur as isize;
    for _ in 0..n {
        i = (i + dir + n) % n;
        if list[i as usize].sel() {
            return i as usize;
        }
    }
    cur
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Screen {
    Main,
    Tasks(usize),
}

pub struct TaskPicker {
    pub parsed: Parsed,
    pub recents: Vec<String>,
    pub screen: Screen,
    pub expanded: bool,
    pub query: String,
    pub m_idx: usize,
    pub t_idx: usize,
    pub columns: u16,
    scroll: usize,
}

impl TaskPicker {
    pub fn new(parsed: Parsed, recents: Vec<String>, columns: u16) -> Self {
        let mut p = TaskPicker {
            parsed,
            recents,
            screen: Screen::Main,
            expanded: false,
            query: String::new(),
            m_idx: 0,
            t_idx: 0,
            columns,
            scroll: 0,
        };
        p.m_idx = first_sel(&p.unfiltered());
        p
    }
    fn unfiltered(&self) -> Vec<Item> {
        match self.screen {
            Screen::Main => build_main(&self.parsed, &self.recents, self.columns),
            Screen::Tasks(c) => build_tasks(&self.parsed.categories[c], self.columns),
        }
    }
    pub fn list(&self) -> Vec<Item> {
        filter_list(&self.unfiltered(), &self.query)
    }
    pub fn idx(&self) -> usize {
        if self.screen == Screen::Main {
            self.m_idx
        } else {
            self.t_idx
        }
    }
    fn set_idx(&mut self, i: usize) {
        if self.screen == Screen::Main {
            self.m_idx = i
        } else {
            self.t_idx = i
        }
    }
    /// The `useEffect` that re-targets the selection after list changes.
    fn fixup(&mut self) {
        let list = self.list();
        let cur = self.idx();
        let i = if list.get(cur).is_some_and(Item::sel) {
            cur.min(list.len().saturating_sub(1))
        } else {
            first_sel(&list)
        };
        self.set_idx(i);
    }
    fn open_cat(&mut self, c: usize) {
        self.screen = Screen::Tasks(c);
        self.query.clear();
        self.t_idx = first_sel(&build_tasks(&self.parsed.categories[c], self.columns));
        self.scroll = 0;
    }
    fn activate(&mut self, it: &Item) -> Option<Option<String>> {
        if let Kind::Cat(c) = it.kind {
            self.open_cat(c);
            None
        } else {
            Some(Some(it.value.clone()))
        }
    }

    /// (top row, height) of every item in the scroll content.
    fn layout(&self, list: &[Item], cw: u16) -> Vec<(usize, Vec<Row>)> {
        let idx = self.idx();
        let mut out = Vec::new();
        let mut top = 0;
        for (i, it) in list.iter().enumerate() {
            let rows = self.item_rows(it, i, i == idx, cw);
            let h = rows.len();
            out.push((top, rows));
            top += h;
        }
        out
    }

    fn item_rows(&self, it: &Item, i: usize, sel: bool, cw: u16) -> Vec<Row> {
        let cw = cw as usize;
        match it.kind {
            Kind::Section => {
                let mut v = Vec::new();
                if i > 0 {
                    v.push(Row::blank());
                }
                v.push(Row::blank().push(
                    0,
                    &it.label,
                    Style::new().fg(rgb(0x16CCDB)).add_modifier(Modifier::BOLD),
                ));
                v
            }
            Kind::Gap => vec![Row::blank()],
            _ => {
                let color = if sel {
                    rgb(0xA2ED5F)
                } else {
                    match it.kind {
                        Kind::Recent => rgb(0xED9F5F),
                        Kind::Cat(_) => rgb(0x33C729),
                        _ => WHITE,
                    }
                };
                let mut ls = Style::new().fg(color);
                if sel {
                    ls = ls.add_modifier(Modifier::BOLD);
                }
                let ind = if sel {
                    ("❯", Style::new().fg(CYAN_BRIGHT))
                } else {
                    (" ", Style::new().fg(GRAY))
                };
                let label = clip(&it.label, cw.saturating_sub(2));
                let show_sub = !self.expanded && !it.sublabel.is_empty();
                // When the row overflows, ink's flex layout swallows the gap after
                // the indicator (`❯Build ~ …`) and wraps the sublabel in its column.
                let overflow =
                    show_sub && 2 + width(&label) + 1 + width(&format!("~ {}", it.sublabel)) > cw;
                let lx = if overflow { 1 } else { 2 };
                let mut first = Row::blank().push(0, ind.0, ind.1).push(lx, &label, ls);
                let mut rows = Vec::new();
                if show_sub {
                    let x = lx as usize + width(&label) + 1;
                    let lines = wrap(&format!("~ {}", it.sublabel), cw.saturating_sub(x));
                    for (n, l) in lines.into_iter().enumerate() {
                        let st = dim().fg(GRAY);
                        if n == 0 {
                            first = first.push(x as u16, l, st);
                        } else {
                            rows.push(Row::blank().push(x as u16, l, st));
                        }
                    }
                }
                rows.insert(0, first);
                if sel && self.expanded && it.kind == Kind::Task && !it.desc.trim().is_empty() {
                    for l in wrap(it.desc.trim(), cw.saturating_sub(2)) {
                        rows.push(Row::blank().push(2, l, Style::new().fg(GRAY)));
                    }
                    rows.push(Row::blank());
                }
                rows
            }
        }
    }

    /// Content rect + list viewport (y, height) for an area.
    fn geometry(area: Rect) -> (Rect, u16, u16) {
        let c = Rect::new(
            area.x + 2,
            area.y + 1,
            area.width.saturating_sub(4),
            area.height.saturating_sub(2),
        );
        let list_y = c.y + 6;
        let list_h = c.height.saturating_sub(6 + 2);
        (c, list_y, list_h)
    }
}

impl Picker for TaskPicker {
    type Out = String;

    fn screen_id(&self) -> u64 {
        match self.screen {
            Screen::Main => 0,
            Screen::Tasks(c) => c as u64 + 1,
        }
    }

    fn handle(&mut self, input: Input, area: Rect) -> Option<Option<String>> {
        self.columns = area.width;
        let list = self.list();
        let idx = self.idx();
        match input {
            Input::Click(row) => {
                let (c, ly, lh) = Self::geometry(area);
                if row < ly || row >= ly + lh {
                    return None;
                }
                let content_row = (row - ly) as usize + self.scroll;
                let lay = self.layout(&list, c.width);
                let hit = lay
                    .iter()
                    .position(|(top, rows)| content_row >= *top && content_row < top + rows.len());
                if let Some(i) = hit.filter(|i| list[*i].sel()) {
                    let it = list[i].clone();
                    return self.activate(&it);
                }
                None
            }
            Input::ScrollUp => {
                self.expanded = false;
                self.set_idx(next_sel(&list, idx, -1));
                None
            }
            Input::ScrollDown => {
                self.expanded = false;
                self.set_idx(next_sel(&list, idx, 1));
                None
            }
            Input::Tab => {
                self.expanded = !self.expanded;
                None
            }
            Input::Backspace => {
                self.query.pop();
                self.set_idx(0);
                self.expanded = false;
                self.fixup();
                None
            }
            Input::Char(ch) => {
                self.query.push(ch);
                self.set_idx(0);
                self.expanded = false;
                self.fixup();
                None
            }
            Input::Up => {
                self.expanded = false;
                self.set_idx(next_sel(&list, idx, -1));
                None
            }
            Input::Down => {
                self.expanded = false;
                self.set_idx(next_sel(&list, idx, 1));
                None
            }
            Input::Enter => {
                let it = list.get(idx).filter(|i| i.sel())?.clone();
                self.activate(&it)
            }
            Input::Esc | Input::Left => {
                if let Screen::Tasks(_) = self.screen {
                    self.query.clear();
                    self.screen = Screen::Main;
                    self.scroll = 0;
                    self.fixup();
                    None
                } else {
                    Some(None)
                }
            }
            Input::CtrlC => Some(None),
            Input::Resize | Input::Other => None,
        }
    }

    fn render(&mut self, area: Rect, buf: &mut Buffer) {
        self.columns = area.width;
        if area.width < 12 || area.height < 10 {
            return;
        }
        let c = frame(area, buf, rgb(0xCECFCF));
        let (title, right, rs) = match self.screen {
            Screen::Main => ("FSR Script Runner".to_string(), "q: quit ", dim()),
            Screen::Tasks(i) => {
                let n = &self.parsed.categories[i].name;
                (
                    if n.is_empty() {
                        "Tasks".into()
                    } else {
                        n.clone()
                    },
                    "← Esc: back",
                    dim().fg(rgb(0xA2ED5F)),
                )
            }
        };
        header(buf, c.x, c.y, c.width, 2, &title, right, rs, rgb(0x233866));
        let div = (area.width as usize).saturating_sub(4).max(10);
        divider(buf, c.x, c.y + 2, c.width, div);
        let q = if self.query.is_empty() {
            gap_row(&[
                (
                    "›",
                    Style::new().fg(GREEN_BRIGHT).add_modifier(Modifier::BOLD),
                ),
                ("", Style::new()),
                ("type to filter", dim()),
            ])
        } else {
            gap_row(&[
                (
                    "›",
                    Style::new().fg(GREEN_BRIGHT).add_modifier(Modifier::BOLD),
                ),
                (&self.query, Style::new().fg(WHITE)),
            ])
        };
        q.draw(buf, c.x, c.y + 4, c.width);

        let (_, ly, lh) = Self::geometry(area);
        let list = self.list();
        let lay = self.layout(&list, c.width);
        if let Some((top, rows)) = lay.get(self.idx()) {
            self.scroll = scroll_into_view(self.scroll, *top, rows.len(), lh as usize);
        }
        let mut y = 0usize;
        for (_, rows) in &lay {
            for r in rows {
                if y >= self.scroll && y < self.scroll + lh as usize {
                    r.draw(buf, c.x, ly + (y - self.scroll) as u16, c.width);
                }
                y += 1;
            }
        }
        let fy = c.y + c.height - 1;
        divider(buf, c.x, fy - 1, c.width, div);
        let k = Style::new().fg(GREEN_BRIGHT).add_modifier(Modifier::BOLD);
        let footer = match self.screen {
            Screen::Tasks(_) => gap_row(&[
                ("↑↓ navigate ", dim()),
                ("↵", k),
                (" select ", dim()),
                ("⇥", Style::new().fg(CYAN_BRIGHT)),
                (
                    if self.expanded {
                        " collapse "
                    } else {
                        " expand "
                    },
                    dim(),
                ),
                ("← Esc", Style::new().fg(YELLOW_BRIGHT)),
                (" back", dim()),
            ]),
            Screen::Main => gap_row(&[
                ("↑↓ navigate ", dim()),
                ("↵", k),
                (" select ", dim()),
                ("Esc", Style::new().fg(YELLOW_BRIGHT)),
                (" quit", dim()),
            ]),
        };
        footer.draw(buf, c.x, fy, c.width);
    }
}
