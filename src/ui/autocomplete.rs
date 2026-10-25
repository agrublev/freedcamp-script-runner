//! Port of `lib/ui/AutoComplete.js` (used by `fsr list` and `fsr scripts`).
//! Follows the JSX layout; items are kept to one row each (the Node version
//! lets long sublabels wrap, which breaks its own row-based scrolling).

use super::*;

#[derive(Debug, Clone, PartialEq)]
pub struct AcItem {
    pub label: String,
    pub sublabel: String,
    pub value: String,
}

impl AcItem {
    /// From `"name   ~   description"` like startScripts.js.
    pub fn from_opt(opt: &str) -> Self {
        let (label, sublabel) = super::task_picker::parse_opt(opt);
        AcItem {
            value: label.clone(),
            label,
            sublabel,
        }
    }
}

pub struct AutoComplete {
    pub items: Vec<AcItem>,
    pub title: String,
    pub query: String,
    pub idx: usize,
    pub scroll: usize,
}

pub fn filter(items: &[AcItem], q: &str) -> Vec<AcItem> {
    if q.is_empty() {
        return items.to_vec();
    }
    let q = q.to_lowercase();
    items
        .iter()
        .filter(|i| i.label.to_lowercase().contains(&q) || i.sublabel.to_lowercase().contains(&q))
        .cloned()
        .collect()
}

impl AutoComplete {
    pub fn new(items: Vec<AcItem>, title: &str) -> Self {
        AutoComplete {
            items,
            title: title.into(),
            query: String::new(),
            idx: 0,
            scroll: 0,
        }
    }
    pub fn filtered(&self) -> Vec<AcItem> {
        filter(&self.items, &self.query)
    }
    pub fn max_rows(rows: u16) -> usize {
        (rows as usize).saturating_sub(14).max(1)
    }
    fn after_query(&mut self) {
        self.idx = 0;
        self.scroll = 0;
    }
    fn follow(&mut self, rows: u16) {
        let m = Self::max_rows(rows);
        if self.idx < self.scroll {
            self.scroll = self.idx;
        } else if self.idx >= self.scroll + m {
            self.scroll = self.idx + 1 - m;
        }
    }
}

impl Picker for AutoComplete {
    type Out = AcItem;

    fn handle(&mut self, input: Input, area: Rect) -> Option<Option<AcItem>> {
        let f = self.filtered();
        match input {
            Input::Click(row) => {
                let list_y = area.y + 1 + 4;
                let arrow = usize::from(self.scroll > 0);
                let vi = (row as isize) - list_y as isize - arrow as isize;
                if vi >= 0
                    && (vi as usize) < Self::max_rows(area.height)
                    && let Some(it) = f.get(self.scroll + vi as usize)
                {
                    return Some(Some(it.clone()));
                }
                None
            }
            Input::Up | Input::ScrollUp => {
                self.idx = self.idx.saturating_sub(1);
                self.follow(area.height);
                None
            }
            Input::Down | Input::ScrollDown => {
                self.idx = (self.idx + 1).min(f.len().saturating_sub(1));
                self.follow(area.height);
                None
            }
            Input::Enter => f.get(self.idx).cloned().map(Some),
            Input::Esc | Input::CtrlC => Some(None),
            Input::Backspace => {
                self.query.pop();
                self.after_query();
                None
            }
            Input::Char(c) => {
                self.query.push(c);
                self.after_query();
                None
            }
            _ => None,
        }
    }

    fn render(&mut self, area: Rect, buf: &mut Buffer) {
        if area.width < 12 || area.height < 8 {
            return;
        }
        let c = frame(area, buf, CYAN);
        let right = "Esc: cancel ";
        Row::blank()
            .push(
                0,
                format!(" {} ", self.title),
                Style::new().fg(CYAN_BRIGHT).add_modifier(Modifier::BOLD),
            )
            .push(c.width.saturating_sub(width(right) as u16), right, dim())
            .draw(buf, c.x, c.y, c.width);
        let div = (area.width as usize).saturating_sub(4).max(10);
        divider(buf, c.x, c.y + 1, c.width, div);
        gap_row(&[
            (
                "›",
                Style::new().fg(GREEN_BRIGHT).add_modifier(Modifier::BOLD),
            ),
            (&self.query, Style::new().fg(WHITE)),
            ("█", Style::new().fg(CYAN)),
        ])
        .draw(buf, c.x, c.y + 2, c.width);

        let f = self.filtered();
        let m = Self::max_rows(area.height);
        let list_top = c.y + 4;
        let list_bottom = c.y + c.height - 2; // exclusive (divider row)
        let mut y = list_top;
        let center = |s: &str| (c.width.saturating_sub(width(s) as u16)) / 2;
        if self.scroll > 0 {
            buf.set_string(c.x + center("  ↑  "), y, "  ↑  ", dim());
            y += 1;
        }
        for (vi, it) in f.iter().skip(self.scroll).take(m).enumerate() {
            if y >= list_bottom {
                break;
            }
            let sel = self.scroll + vi == self.idx;
            let ls = if sel {
                Style::new().fg(CYAN_BRIGHT).add_modifier(Modifier::BOLD)
            } else {
                Style::new().fg(WHITE)
            };
            let ind = if sel {
                ("❯", Style::new().fg(CYAN_BRIGHT))
            } else {
                (" ", Style::new().fg(GRAY))
            };
            let mut r = Row::blank().push(0, ind.0, ind.1).push(2, &it.label, ls);
            if !it.sublabel.is_empty() {
                let x = 2 + width(&it.label) + 1;
                let sub = it.sublabel.replace('\n', " ");
                let room = (c.width as usize).saturating_sub(x);
                let text = format!("~  {sub}");
                let text = if width(&text) > room {
                    format!("{}…", clip(&text, room.saturating_sub(1)))
                } else {
                    text
                };
                r = r.push(x as u16, text, dim().fg(GRAY));
            }
            r.draw(buf, c.x, y, c.width);
            y += 1;
        }
        if f.is_empty() {
            buf.set_string(
                c.x + center(" no matches "),
                y,
                " no matches ",
                dim().fg(Color::Red),
            );
        }
        if f.len() > self.scroll + m {
            buf.set_string(c.x + center("  ↓  "), list_bottom - 1, "  ↓  ", dim());
        }
        divider(buf, c.x, c.y + c.height - 2, c.width, div);
        gap_row(&[
            ("↑↓ navigate ", dim()),
            (
                "↵",
                Style::new().fg(GREEN_BRIGHT).add_modifier(Modifier::BOLD),
            ),
            (" select  type to filter ", dim()),
            ("mouse", Style::new().fg(YELLOW_BRIGHT)),
            (" click to select", dim()),
        ])
        .draw(buf, c.x, c.y + c.height - 1, c.width);
    }
}
