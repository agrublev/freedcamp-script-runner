//! TestBackend snapshot tests for the ratatui pickers. `tests/ui_snapshots/node/*`
//! are text screens of the *Node/ink* pickers captured in a 100x30 pty
//! (see /workspace/ui-compare/capture.py); the Rust render must match them.
use fsr::ui::autocomplete::{AcItem, AutoComplete};
use fsr::ui::menu::{Menu, default_items};
use fsr::ui::task_picker::{Kind, TaskPicker, build_main, filter_list, first_sel, next_sel};
use fsr::ui::{Input, Picker};
use ratatui::{Terminal, backend::TestBackend, layout::Rect};
use std::path::Path;

const W: u16 = 100;
const H: u16 = 30;

fn area() -> Rect {
    Rect::new(0, 0, W, H)
}

fn screen<P: Picker>(p: &mut P) -> String {
    let mut t = Terminal::new(TestBackend::new(W, H)).unwrap();
    t.draw(|f| {
        let a = f.area();
        p.render(a, f.buffer_mut())
    })
    .unwrap();
    let buf = t.backend().buffer().clone();
    (0..H)
        .map(|y| {
            (0..W)
                .map(|x| buf[(x, y)].symbol().to_string())
                .collect::<String>()
                .trim_end()
                .to_string()
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn node(name: &str) -> String {
    let p = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/ui_snapshots/node")
        .join(format!("{name}.txt"));
    let s = std::fs::read_to_string(p).unwrap();
    s.lines()
        .skip(1)
        .map(str::trim_end)
        .collect::<Vec<_>>()
        .join("\n")
}

fn assert_screen(got: &str, want: &str, name: &str) {
    if got != want {
        let diff: Vec<String> = got
            .lines()
            .zip(want.lines())
            .enumerate()
            .filter(|(_, (a, b))| a != b)
            .map(|(i, (a, b))| format!("row {i}\n rust: {a}\n node: {b}"))
            .take(5)
            .collect();
        panic!("{name} differs from Node:\n{}", diff.join("\n"));
    }
}

fn parsed() -> fsr::parse::Parsed {
    let md = std::fs::read_to_string(
        Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/ui_snapshots/fscripts.md"),
    )
    .unwrap();
    fsr::parse::parse(fsr::parse::strip_toc(&md))
}

fn recents() -> Vec<String> {
    // the times captured in tests/ui_snapshots/node/start.00.txt
    let s = node("start.00");
    let times: Vec<String> = s
        .lines()
        .filter_map(|l| {
            l.split(" ~ ")
                .nth(1)
                .filter(|t| t.contains("Today at"))
                .map(|t| t.trim_end_matches(['│', ' ']).to_string())
        })
        .collect();
    vec![
        format!("build   ~   {}", times[0]),
        format!("test   ~   {}", times[1]),
    ]
}

#[test]
fn task_picker_matches_node_screens() {
    let mut p = TaskPicker::new(parsed(), recents(), W);
    let steps: &[(Option<Input>, &str)] = &[
        (None, "start.00"),
        (Some(Input::Down), "start.01"),
        (Some(Input::Down), "start.02"),
        (Some(Input::Down), "start.03"),
        (Some(Input::Enter), "start.04"),
        (Some(Input::Tab), "start.05"),
        (Some(Input::Esc), "start.06"),
    ];
    for (input, name) in steps {
        if let Some(i) = input {
            assert_eq!(p.handle(i.clone(), area()), None);
        }
        assert_screen(&screen(&mut p), &node(name), name);
    }
    p.handle(Input::Char('b'), area());
    p.handle(Input::Char('u'), area());
    assert_screen(&screen(&mut p), &node("start.07"), "start.07");
    p.handle(Input::Backspace, area());
    p.handle(Input::Backspace, area());
    assert_screen(&screen(&mut p), &node("start.08"), "start.08");
    assert_eq!(
        p.handle(Input::Esc, area()),
        Some(None),
        "Esc on main quits"
    );
}

#[test]
fn task_picker_mouse_click_opens_category_like_node() {
    let mut p = TaskPicker::new(parsed(), recents(), W);
    screen(&mut p);
    // Node capture: SGR click at 1-based row 16 (the "Build" category)
    assert_eq!(p.handle(Input::Click(15), area()), None);
    assert_screen(&screen(&mut p), &node("click.01"), "click.01");
    // second click (row 8, 1-based) selects the first task
    assert_eq!(
        p.handle(Input::Click(7), area()),
        Some(Some("build".into()))
    );
}

#[test]
fn menu_matches_node_screens() {
    let mut m = Menu::new(default_items());
    assert_screen(&screen(&mut m), &node("menu.00"), "menu.00");
    m.handle(Input::Down, area());
    assert_screen(&screen(&mut m), &node("menu.01"), "menu.01");
    m.handle(Input::Down, area());
    assert_screen(&screen(&mut m), &node("menu.02"), "menu.02");
    assert_eq!(m.handle(Input::Enter, area()), Some(Some("list".into())));
    m.handle(Input::Up, area());
    m.handle(Input::Up, area());
    m.handle(Input::Up, area());
    assert_eq!(m.idx, default_items().len() - 1, "wraps around");
    // scrolled to the bottom: last item box is fully visible
    assert!(screen(&mut m).contains("greet"));
    assert_eq!(m.handle(Input::Esc, area()), Some(None));
}

#[test]
fn filter_and_selection_logic() {
    let p = parsed();
    let main = build_main(&p, &recents(), W);
    assert_eq!(main[0].kind, Kind::Section);
    assert_eq!(first_sel(&main), 1);
    let f = filter_list(&main, "BU");
    let labels: Vec<_> = f.iter().map(|i| i.label.as_str()).collect();
    assert_eq!(labels, ["  ★ Recent", "build", "  ⬡ Categories", "Build"]);
    // wrap-around skips sections/gaps
    assert_eq!(next_sel(&f, 1, -1), 3);
    assert_eq!(next_sel(&f, 3, 1), 1);
    assert!(filter_list(&main, "zzz").is_empty());
}

#[test]
fn autocomplete_filter_scroll_click() {
    let items: Vec<AcItem> = (0..40)
        .map(|i| AcItem::from_opt(&format!("task{i}   ~   desc {i}")))
        .collect();
    let mut a = AutoComplete::new(items, "Choose task to run");
    let s = screen(&mut a);
    assert!(s.contains(" Choose task to run ") && s.contains("Esc: cancel") && s.contains("›  █"));
    assert!(s.contains("  ↓  ") && !s.contains("  ↑  "));
    for _ in 0..20 {
        a.handle(Input::Down, area());
    }
    assert_eq!(a.idx, 20);
    assert_eq!(a.scroll, 20 + 1 - AutoComplete::max_rows(H));
    assert!(screen(&mut a).contains("  ↑  "));
    a.handle(Input::Char('3'), area());
    assert_eq!((a.idx, a.scroll), (0, 0));
    assert_eq!(
        a.filtered()
            .iter()
            .map(|i| i.value.clone())
            .collect::<Vec<_>>(),
        [
            "task3", "task13", "task23", "task30", "task31", "task32", "task33", "task34",
            "task35", "task36", "task37", "task38", "task39"
        ]
    );
    // click on the 2nd visible row (border 1 + header/divider/query/margin 4)
    assert_eq!(
        a.handle(Input::Click(6), area()),
        Some(Some(a.filtered()[1].clone()))
    );
    a.handle(Input::Char('x'), area());
    assert!(screen(&mut a).contains(" no matches "));
    assert_eq!(
        a.handle(Input::Enter, area()),
        None,
        "Enter with no match does nothing"
    );
    assert_eq!(a.handle(Input::CtrlC, area()), Some(None));
}

#[test]
fn keys_map_like_ink() {
    use fsr::ui::from_event;
    use ratatui::crossterm::event::{
        Event, KeyCode, KeyEvent, KeyModifiers, MouseButton, MouseEvent, MouseEventKind,
    };
    let k = |c, m| from_event(Event::Key(KeyEvent::new(c, m)));
    assert_eq!(k(KeyCode::Char('c'), KeyModifiers::CONTROL), Input::CtrlC);
    assert_eq!(
        k(KeyCode::Char('q'), KeyModifiers::NONE),
        Input::Char('q'),
        "q types (Node shows 'q: quit' but q filters)"
    );
    assert_eq!(k(KeyCode::Delete, KeyModifiers::NONE), Input::Backspace);
    let m = |kind| {
        from_event(Event::Mouse(MouseEvent {
            kind,
            column: 3,
            row: 9,
            modifiers: KeyModifiers::NONE,
        }))
    };
    assert_eq!(m(MouseEventKind::Down(MouseButton::Left)), Input::Click(9));
    assert_eq!(m(MouseEventKind::Down(MouseButton::Right)), Input::Other);
    assert_eq!(m(MouseEventKind::ScrollDown), Input::ScrollDown);
}
