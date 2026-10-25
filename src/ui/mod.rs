//! ratatui ports of the ink UI in `lib/ui/` (TaskPicker, AutoComplete,
//! PluginPicker). Each picker is a pure state machine (`handle(Input)`) plus a
//! `render(area, buf)` so it can be snapshot-tested with `TestBackend`.

pub mod autocomplete;
pub mod menu;
pub mod task_picker;

use ratatui::buffer::Buffer;
use ratatui::crossterm::event::{
    self, Event, KeyCode, KeyEvent, KeyEventKind, KeyModifiers, MouseButton, MouseEventKind,
};
use ratatui::layout::Rect;
use ratatui::style::{Color, Modifier, Style};
use unicode_width::{UnicodeWidthChar, UnicodeWidthStr};

/// Picker input, decoupled from crossterm so state logic is testable.
#[derive(Debug, Clone, PartialEq)]
pub enum Input {
    Char(char),
    Up,
    Down,
    Left,
    Enter,
    Tab,
    Backspace,
    Esc,
    CtrlC,
    /// Primary-button press at 0-based terminal row.
    Click(u16),
    ScrollUp,
    ScrollDown,
    Resize,
    Other,
}

pub fn from_event(ev: Event) -> Input {
    match ev {
        Event::Key(KeyEvent {
            code,
            modifiers,
            kind,
            ..
        }) if kind != KeyEventKind::Release => {
            let ctrl = modifiers.contains(KeyModifiers::CONTROL);
            let alt = modifiers.contains(KeyModifiers::ALT);
            match code {
                KeyCode::Char('c') if ctrl => Input::CtrlC,
                KeyCode::Char(c) if !ctrl && !alt && !c.is_control() => Input::Char(c),
                KeyCode::Up => Input::Up,
                KeyCode::Down => Input::Down,
                KeyCode::Left => Input::Left,
                KeyCode::Enter => Input::Enter,
                KeyCode::Tab => Input::Tab,
                KeyCode::Backspace | KeyCode::Delete => Input::Backspace,
                KeyCode::Esc => Input::Esc,
                _ => Input::Other,
            }
        }
        Event::Mouse(m) => match m.kind {
            MouseEventKind::Down(MouseButton::Left) => Input::Click(m.row),
            MouseEventKind::ScrollUp => Input::ScrollUp,
            MouseEventKind::ScrollDown => Input::ScrollDown,
            _ => Input::Other,
        },
        Event::Paste(_) => Input::Other,
        Event::Resize(..) => Input::Resize,
        _ => Input::Other,
    }
}

/// A picker that can be driven by [`run`].
pub trait Picker {
    type Out;
    /// `Some(result)` ends the picker (`result` may be `None` = cancelled).
    fn handle(&mut self, input: Input, area: Rect) -> Option<Option<Self::Out>>;
    fn render(&mut self, area: Rect, buf: &mut Buffer);
}

/// Restores the terminal even on early return / panic.
struct Guard;
impl Drop for Guard {
    fn drop(&mut self) {
        let _ = ratatui::crossterm::execute!(
            std::io::stdout(),
            ratatui::crossterm::event::DisableMouseCapture
        );
        ratatui::restore();
    }
}

/// Run a picker like ink does: inline in the normal screen at full terminal
/// height (no alternate screen), raw mode + mouse reporting. On exit the last
/// frame stays visible and the cursor moves below it, as with ink.
pub fn run<P: Picker>(mut p: P) -> anyhow::Result<Option<P::Out>> {
    use ratatui::{TerminalOptions, Viewport};
    let (cols, rows) = ratatui::crossterm::terminal::size().unwrap_or((80, 24));
    // Scroll existing output up like ink does, then draw a fixed full-height
    // viewport (avoids the cursor-position query Viewport::Inline needs).
    print!("{}", "\n".repeat(rows as usize));
    let _ = std::io::Write::flush(&mut std::io::stdout());
    // installs a panic hook that restores the terminal
    let mut term = ratatui::init_with_options(TerminalOptions {
        viewport: Viewport::Fixed(Rect::new(0, 0, cols, rows)),
    });
    let _g = Guard;
    ratatui::crossterm::execute!(
        std::io::stdout(),
        ratatui::crossterm::event::EnableMouseCapture
    )?;
    let res = event_loop(&mut p, &mut term);
    let bottom = term.get_frame().area().bottom().saturating_sub(1);
    let _ = term.set_cursor_position((0, bottom));
    let _ = term.show_cursor();
    drop(_g);
    print!("\r\n");
    res
}

fn event_loop<P: Picker>(
    p: &mut P,
    term: &mut ratatui::DefaultTerminal,
) -> anyhow::Result<Option<P::Out>> {
    loop {
        term.draw(|f| {
            let a = f.area();
            p.render(a, f.buffer_mut());
        })?;
        let input = from_event(event::read()?);
        if input == Input::Resize {
            let (w, h) = ratatui::crossterm::terminal::size()?;
            term.resize(Rect::new(0, 0, w, h))?;
        }
        let area = term.get_frame().area();
        if let Some(out) = p.handle(input, area) {
            return Ok(out);
        }
    }
}

/// `fsrLog.log` from lib/utils/console.js: gray `HH:MM:SS [LOG] msg`.
pub fn log(msg: &str) {
    println!(
        "\x1b[90m{}\x1b[39m \x1b[90;1m[LOG]\x1b[0m {msg}",
        chrono::Local::now().format("%H:%M:%S")
    );
}

// ---------- shared styling (ink/chalk color names → ratatui) ----------

pub const fn rgb(hex: u32) -> Color {
    Color::Rgb((hex >> 16) as u8, (hex >> 8) as u8, hex as u8)
}
pub fn dim() -> Style {
    Style::new().add_modifier(Modifier::DIM)
}
/// chalk `cyan` (ANSI 36)
pub const CYAN: Color = Color::Cyan;
/// chalk `white` (ANSI 37) is ratatui `Gray`
pub const WHITE: Color = Color::Gray;
/// chalk `gray` (ANSI 90) is ratatui `DarkGray`
pub const GRAY: Color = Color::DarkGray;
pub const GREEN_BRIGHT: Color = Color::LightGreen;
pub const CYAN_BRIGHT: Color = Color::LightCyan;
pub const YELLOW_BRIGHT: Color = Color::LightYellow;

pub fn width(s: &str) -> usize {
    UnicodeWidthStr::width(s)
}

/// Truncate to display width.
pub fn clip(s: &str, max: usize) -> String {
    let mut w = 0;
    let mut out = String::new();
    for c in s.chars() {
        let cw = c.width().unwrap_or(0);
        if w + cw > max {
            break;
        }
        w += cw;
        out.push(c);
    }
    out
}

/// Greedy word wrap (like wrap-ansi used by ink), hard-breaking long words.
pub fn wrap(s: &str, max: usize) -> Vec<String> {
    let max = max.max(1);
    let mut lines = Vec::new();
    for para in s.split('\n') {
        let mut cur = String::new();
        for word in para.split(' ').filter(|w| !w.is_empty()) {
            let mut word = word.to_string();
            loop {
                let sep = usize::from(!cur.is_empty());
                if width(&cur) + sep + width(&word) <= max {
                    if sep == 1 {
                        cur.push(' ');
                    }
                    cur.push_str(&word);
                    break;
                }
                if !cur.is_empty() {
                    lines.push(std::mem::take(&mut cur));
                    continue;
                }
                let head = clip(&word, max);
                word = word[head.len()..].to_string();
                lines.push(head);
                if word.is_empty() {
                    break;
                }
            }
        }
        lines.push(cur);
    }
    while lines.len() > 1 && lines.last().is_some_and(String::is_empty) {
        lines.pop();
    }
    lines
}

/// JS `String.prototype.slice(0, end)` on chars (negative end counts from the end).
pub fn js_slice_to(s: &str, end: isize) -> String {
    let n = s.chars().count() as isize;
    let e = if end < 0 {
        (n + end).max(0)
    } else {
        end.min(n)
    };
    s.chars().take(e as usize).collect()
}

/// One styled row of content: (x offset, text, style) segments.
#[derive(Debug, Clone, Default)]
pub struct Row {
    pub segs: Vec<(u16, String, Style)>,
    pub bg: Option<Color>,
}

impl Row {
    pub fn blank() -> Self {
        Self::default()
    }
    pub fn push(mut self, x: u16, s: impl Into<String>, st: Style) -> Self {
        self.segs.push((x, s.into(), st));
        self
    }
    pub fn draw(&self, buf: &mut Buffer, x: u16, y: u16, w: u16) {
        if let Some(bg) = self.bg {
            buf.set_style(Rect::new(x, y, w, 1), Style::new().bg(bg));
        }
        for (dx, s, st) in &self.segs {
            if *dx >= w {
                continue;
            }
            let avail = (w - dx) as usize;
            let mut st = *st;
            if let Some(bg) = self.bg {
                st = st.bg(bg);
            }
            buf.set_stringn(x + dx, y, s, avail, st);
        }
    }
}

/// Text segments laid out with ink's `gap={1}`.
pub fn gap_row(parts: &[(&str, Style)]) -> Row {
    let mut r = Row::blank();
    let mut x = 0u16;
    for (i, (s, st)) in parts.iter().enumerate() {
        if i > 0 {
            x += 1;
        }
        r.segs.push((x, s.to_string(), *st));
        x += width(s) as u16;
    }
    r
}

/// Draw the outer rounded border (ink `borderStyle="round"`). Returns content
/// rect after `paddingX={1}`.
pub fn frame(area: Rect, buf: &mut Buffer, color: Color) -> Rect {
    use ratatui::widgets::{Block, BorderType, Widget};
    Block::bordered()
        .border_type(BorderType::Rounded)
        .border_style(Style::new().fg(color))
        .render(area, buf);
    Rect::new(
        area.x + 2,
        area.y + 1,
        area.width.saturating_sub(4),
        area.height.saturating_sub(2),
    )
}

/// Header box: `paddingY={1}` with background; ink shrinks it to 2 rows when
/// the picker overflows the terminal (which the Node layout always does).
/// `left` is prefixed with "\u{a0} \u{e0b1} " (the Nerd-Font glyph used in the
/// JSX); ink measures that glyph as 2 columns while terminals draw 1, so the
/// right-hand text lands one column left of the edge — reproduced here.
#[allow(clippy::too_many_arguments)]
pub fn header(
    buf: &mut Buffer,
    x: u16,
    y: u16,
    w: u16,
    rows: u16,
    left: &str,
    right: &str,
    right_style: Style,
    bg: Color,
) {
    for r in 0..rows {
        Row {
            bg: Some(bg),
            ..Row::blank()
        }
        .draw(buf, x, y + r, w);
    }
    let left = format!("\u{a0} \u{e0b1} {left}");
    let rw = width(right) as u16;
    Row {
        bg: Some(bg),
        ..Row::blank()
    }
    .push(
        0,
        &left,
        Style::new().fg(rgb(0xFFFFFF)).add_modifier(Modifier::BOLD),
    )
    .push(w.saturating_sub(rw), right, right_style)
    .draw(buf, x, y + 1, w);
}

pub fn divider(buf: &mut Buffer, x: u16, y: u16, w: u16, len: usize) {
    buf.set_stringn(x, y, "─".repeat(len), w as usize, dim().fg(CYAN));
}

/// Keep `[top, top+h)` visible in a viewport of `view` rows (ink-scroll-list).
pub fn scroll_into_view(scroll: usize, top: usize, h: usize, view: usize) -> usize {
    if top < scroll {
        top
    } else if top + h > scroll + view {
        (top + h).saturating_sub(view).min(top)
    } else {
        scroll
    }
}

/// moment().calendar() for a past/future timestamp in ms.
pub fn calendar(ms: f64, now: chrono::DateTime<chrono::Local>) -> String {
    use chrono::{Datelike, TimeZone};
    let Some(t) = chrono::Local.timestamp_millis_opt(ms as i64).single() else {
        return String::new();
    };
    let days = (t.date_naive() - now.date_naive()).num_days();
    let time = t.format("%-I:%M %p").to_string();
    match days {
        0 => format!("Today at {time}"),
        -1 => format!("Yesterday at {time}"),
        1 => format!("Tomorrow at {time}"),
        -6..=-2 => format!("Last {} at {time}", t.format("%A")),
        2..=6 => format!("{} at {time}", t.format("%A")),
        _ => format!("{:02}/{:02}/{}", t.month(), t.day(), t.year()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn wrap_and_slice() {
        assert_eq!(wrap("aa bb cc", 5), ["aa bb", "cc"]);
        assert_eq!(wrap("abcdefgh", 3), ["abc", "def", "gh"]);
        assert_eq!(js_slice_to("hello", -2), "hel");
        assert_eq!(js_slice_to("hello", 10), "hello");
        assert_eq!(scroll_into_view(0, 10, 2, 5), 7);
        assert_eq!(scroll_into_view(8, 3, 1, 5), 3);
    }
    #[test]
    fn moment_calendar() {
        use chrono::TimeZone;
        let now = chrono::Local
            .with_ymd_and_hms(2026, 10, 25, 22, 44, 0)
            .unwrap();
        let ms = |d: chrono::DateTime<chrono::Local>| d.timestamp_millis() as f64;
        assert_eq!(calendar(ms(now), now), "Today at 10:44 PM");
        assert_eq!(
            calendar(
                ms(chrono::Local
                    .with_ymd_and_hms(2026, 10, 24, 9, 5, 0)
                    .unwrap()),
                now
            ),
            "Yesterday at 9:05 AM"
        );
        assert_eq!(
            calendar(
                ms(chrono::Local
                    .with_ymd_and_hms(2026, 10, 20, 9, 5, 0)
                    .unwrap()),
                now
            ),
            "Last Tuesday at 9:05 AM"
        );
        assert_eq!(
            calendar(
                ms(chrono::Local.with_ymd_and_hms(2026, 1, 2, 9, 5, 0).unwrap()),
                now
            ),
            "01/02/2026"
        );
    }
}
