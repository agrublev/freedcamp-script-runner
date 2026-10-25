//! Port of `lib/running/parseTask.js`.
use crate::parse::Task;

#[derive(Debug, Clone, PartialEq)]
pub struct Script {
    pub lang: Option<String>,
    /// Ordered env overlay (profile vars first, then inline `KEY=value`).
    pub env: Vec<(String, String)>,
    /// Executable (`node` for javascript tasks).
    pub kind: String,
    /// Remaining argument string (or full JS source for javascript tasks).
    pub full: String,
}

fn set(env: &mut Vec<(String, String)>, k: &str, v: &str) {
    if let Some(e) = env.iter_mut().find(|(ek, _)| ek == k) {
        e.1 = v.into();
    } else {
        env.push((k.into(), v.into()));
    }
}

pub fn parse_task(t: &Task) -> Script {
    let mut env = Vec::new();
    if let Some(p) = &t.env {
        set(&mut env, "NODE_ENV", p);
        set(&mut env, "FSR_ENV", p);
    }
    if t.lang.as_deref() == Some("javascript") {
        return Script {
            lang: t.lang.clone(),
            env,
            kind: "node".into(),
            full: t.script.clone(),
        };
    }
    let mut tokens: Vec<&str> = t.script.split(' ').collect();
    let mut i = 0;
    while i < tokens.len() && tokens[i].contains('=') {
        let (k, v) = tokens[i].split_once('=').unwrap();
        set(&mut env, k, v);
        i += 1;
    }
    tokens.drain(..i);
    let kind = if tokens.is_empty() {
        String::new()
    } else {
        tokens.remove(0).to_string()
    };
    Script {
        lang: t.lang.clone(),
        env,
        kind,
        full: tokens.join(" "),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn task(script: &str, lang: &str, env: Option<&str>) -> Task {
        Task {
            script: script.into(),
            lang: Some(lang.into()),
            env: env.map(Into::into),
            ..Default::default()
        }
    }
    #[test]
    fn splits_env_and_command() {
        let s = parse_task(&task("A=1 B=x=y yarn build --prod", "bash", None));
        assert_eq!(
            s.env,
            vec![("A".into(), "1".into()), ("B".into(), "x=y".into())]
        );
        assert_eq!(s.kind, "yarn");
        assert_eq!(s.full, "build --prod");
    }
    #[test]
    fn profile_env_and_override() {
        let s = parse_task(&task("NODE_ENV=test jest", "bash", Some("staging")));
        assert_eq!(s.env[0], ("NODE_ENV".into(), "test".into()));
        assert_eq!(s.env[1], ("FSR_ENV".into(), "staging".into()));
    }
    #[test]
    fn javascript_verbatim() {
        let s = parse_task(&task("console.log(1 + 1)", "javascript", None));
        assert_eq!(s.kind, "node");
        assert_eq!(s.full, "console.log(1 + 1)");
    }
}
