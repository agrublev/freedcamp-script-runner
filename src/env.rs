//! Port of `getEnvArg` / `normalizeEnv` from `lib/utils/index.js`.

/// Normalise short env names: `prod` → `production`, `dev` → `development`.
pub fn normalize_env(v: &str) -> String {
    match v {
        "prod" => "production".into(),
        "dev" => "development".into(),
        other => other.into(),
    }
}

/// Extract `--env X`, `--env=X`, `-e X`, `--prod`, `--dev` from args.
/// Returns the profile (if any) and the remaining args.
pub fn get_env_arg(args: &[String]) -> (Option<String>, Vec<String>) {
    let mut env = None;
    let mut cleaned = Vec::new();
    let mut i = 0;
    while i < args.len() {
        let a = args[i].as_str();
        if a == "--prod" {
            env = Some("production".into());
        } else if a == "--dev" {
            env = Some("development".into());
        } else if let Some(v) = a.strip_prefix("--env=") {
            env = if v.is_empty() {
                None
            } else {
                Some(normalize_env(v))
            };
        } else if a == "--env" || a == "-e" {
            if let Some(next) = args.get(i + 1).filter(|n| !n.starts_with('-')) {
                env = Some(normalize_env(next));
                i += 1;
            }
        } else {
            cleaned.push(args[i].clone());
        }
        i += 1;
    }
    (env, cleaned)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn s(v: &[&str]) -> Vec<String> {
        v.iter().map(|x| x.to_string()).collect()
    }
    #[test]
    fn parses_all_forms() {
        assert_eq!(
            get_env_arg(&s(&["run", "--env", "prod", "x"])),
            (Some("production".into()), s(&["run", "x"]))
        );
        assert_eq!(
            get_env_arg(&s(&["--env=staging"])).0,
            Some("staging".into())
        );
        assert_eq!(
            get_env_arg(&s(&["-e", "dev"])).0,
            Some("development".into())
        );
        assert_eq!(get_env_arg(&s(&["--prod"])).0, Some("production".into()));
        assert_eq!(get_env_arg(&s(&["--env", "--x"])), (None, s(&["--x"])));
        assert_eq!(get_env_arg(&s(&["a"])), (None, s(&["a"])));
    }
}
