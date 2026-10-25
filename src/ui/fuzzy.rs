//! Picker matching: case-insensitive substring hits first (the JS behaviour,
//! original order kept), then fuzzy-only hits ranked by nucleo's score.

use nucleo_matcher::pattern::{AtomKind, CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher, Utf32Str};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Hit {
    /// substring of label or sublabel (JS `includes`)
    Exact,
    /// fuzzy-only; higher score is better
    Fuzzy(u32),
}

pub struct Fuzzy {
    q: String,
    pattern: Pattern,
    matcher: Matcher,
    buf: Vec<char>,
}

impl Fuzzy {
    pub fn new(query: &str) -> Self {
        Fuzzy {
            q: query.to_lowercase(),
            pattern: Pattern::new(
                query,
                CaseMatching::Ignore,
                Normalization::Smart,
                AtomKind::Fuzzy,
            ),
            matcher: Matcher::new(Config::DEFAULT),
            buf: Vec::new(),
        }
    }
    pub fn hit(&mut self, label: &str, sublabel: &str) -> Option<Hit> {
        if label.to_lowercase().contains(&self.q) || sublabel.to_lowercase().contains(&self.q) {
            return Some(Hit::Exact);
        }
        // Only the label is fuzzy-matched; descriptions are long and would
        // match almost any short query.
        self.pattern
            .score(Utf32Str::new(label, &mut self.buf), &mut self.matcher)
            .map(Hit::Fuzzy)
    }
}

/// Indices of matching items: exact hits in order, then fuzzy by score desc
/// (ties keep original order).
pub fn rank<'a>(
    query: &str,
    items: impl Iterator<Item = (&'a str, &'a str)>,
) -> (Vec<usize>, Vec<usize>) {
    let mut f = Fuzzy::new(query);
    let mut exact = Vec::new();
    let mut fuzzy = Vec::new();
    for (i, (l, s)) in items.enumerate() {
        match f.hit(l, s) {
            Some(Hit::Exact) => exact.push(i),
            Some(Hit::Fuzzy(sc)) => fuzzy.push((sc, i)),
            None => {}
        }
    }
    fuzzy.sort_by(|a, b| b.0.cmp(&a.0).then(a.1.cmp(&b.1)));
    (exact, fuzzy.into_iter().map(|x| x.1).collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_first_then_fuzzy() {
        let items = [
            ("build:ui", ""),
            ("bld", ""),
            ("release:build", ""),
            ("test", "builds it"),
            ("b-u-i-l-d", ""),
        ];
        let (e, f) = rank("build", items.iter().map(|(a, b)| (*a, *b)));
        assert_eq!(e, vec![0, 2, 3]);
        assert_eq!(f, vec![4]);
        let (e, f) = rank("tcov", [("test:coverage", ""), ("toc", "")].into_iter());
        assert!(e.is_empty());
        assert_eq!(f, vec![0]);
    }
}
