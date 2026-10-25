//! Runs a picker whose render panics, to check that the terminal is restored.
use fsr::ui::{Input, Picker};
use ratatui::buffer::Buffer;
use ratatui::layout::Rect;

/// First frame renders normally (draw hides the cursor); the frame after the
/// first key press panics.
struct Boom(u32);
impl Picker for Boom {
    type Out = ();
    fn handle(&mut self, _: Input, _: Rect) -> Option<Option<()>> {
        None
    }
    fn render(&mut self, area: Rect, buf: &mut Buffer) {
        self.0 += 1;
        if self.0 > 1 {
            panic!("boom in render");
        }
        buf.set_string(area.x, area.y, "frame one", ratatui::style::Style::new());
    }
}

fn main() {
    let _ = fsr::ui::run(Boom(0));
}
