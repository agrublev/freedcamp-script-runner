#!/bin/sh
# Release fsr: bump Cargo.toml + Cargo.lock + package.json, commit, tag vX.Y.Z,
# and push. The tag push triggers .github/workflows/release-rust.yml, which
# builds all platforms and publishes the GitHub Release the installers download.
#
#   scripts/release.sh patch|minor|major|X.Y.Z [--yes] [--no-test] [--watch] [--dry-run]
set -eu
REPO="agrublev/freedcamp-script-runner"
cd "$(dirname "$0")/.."

err() { printf '\033[31merror:\033[0m %s\n' "$1" >&2; exit 1; }
kind="" yes=0 test=1 dry=0 watch=0
for a in "$@"; do
  case "$a" in
    --yes | -y) yes=1 ;;
    --no-test) test=0 ;;
    --dry-run) dry=1 ;;
    --watch) watch=1 ;;
    patch | minor | major) kind="$a" ;;
    [0-9]*.[0-9]*.[0-9]*) kind="$a" ;;
    *) err "unknown argument: $a" ;;
  esac
done
[ -n "$kind" ] || err "usage: scripts/release.sh patch|minor|major|X.Y.Z [--yes] [--no-test] [--watch] [--dry-run]"

cur="$(perl -0ne 'print $1 if /\[package\][^\[]*?\nversion\s*=\s*"([^"]*)"/' Cargo.toml)"
[ -n "$cur" ] || err "no version in Cargo.toml"
case "$kind" in
  patch | minor | major)
    new="$(echo "${cur%%-*}" | awk -F. -v k="$kind" '{
      if (k=="major") print $1+1".0.0"; else if (k=="minor") print $1"."$2+1".0"; else print $1"."$2"."$3+1 }')" ;;
  *) new="$kind" ;;
esac
tag="v$new"
branch="$(git rev-parse --abbrev-ref HEAD)"

[ "$branch" != HEAD ] || err "detached HEAD; check out a branch first"
[ -z "$(git status --porcelain)" ] || err "working tree not clean; commit or stash first"
git rev-parse -q --verify "refs/tags/$tag" >/dev/null && err "tag $tag already exists"
git fetch -q origin "$branch" 2>/dev/null || true
if git rev-parse -q --verify "origin/$branch" >/dev/null &&
  [ -n "$(git rev-list "HEAD..origin/$branch")" ]; then
  err "origin/$branch has commits you don't; pull first"
fi
git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null 2>&1 && err "tag $tag already exists on origin"
[ -f .github/workflows/release-rust.yml ] || err ".github/workflows/release-rust.yml is missing; the tag push would build nothing"

echo "Release $tag on $branch"
echo "  Cargo.toml   $cur -> $new"
echo "  package.json $cur -> $new"
[ "$dry" = 1 ] && { echo "(dry run, nothing changed)"; exit 0; }
if [ "$yes" != 1 ]; then
  printf 'Continue? [y/N] '
  read -r ans </dev/tty || ans=""
  case "$ans" in y | Y | yes) ;; *) echo "Aborted."; exit 1 ;; esac
fi

# Bump every version source (perl: same behaviour on macOS and Linux).
command -v perl >/dev/null 2>&1 || err "perl is required"
export NEW="$new"
perl -0pi -e 's/(\[package\][^\[]*?\nversion\s*=\s*")[^"]*"/${1}$ENV{NEW}"/' Cargo.toml
name="$(perl -0ne 'print $1 if /\[package\][^\[]*?\nname\s*=\s*"([^"]*)"/' Cargo.toml)"
export NAME="$name"
[ -f Cargo.lock ] && perl -0pi -e 's/(\nname = "\Q$ENV{NAME}\E"\nversion = ")[^"]*"/${1}$ENV{NEW}"/' Cargo.lock
[ -f package.json ] && perl -0pi -e 's/("version"\s*:\s*")[^"]*"/${1}$ENV{NEW}"/' package.json

grep -q "^version = \"$new\"" Cargo.toml || err "failed to update Cargo.toml"
[ -f package.json ] && grep -q "\"version\": \"$new\"" package.json || err "failed to update package.json"

restore() { git checkout -- Cargo.toml Cargo.lock package.json 2>/dev/null; }
if [ "$test" = 1 ]; then
  echo "Running cargo test..."
  cargo test --quiet || { restore; err "tests failed; versions restored"; }
fi
cargo metadata --locked --format-version 1 >/dev/null || { restore; err "Cargo.lock out of date; versions restored"; }

git add Cargo.toml Cargo.lock package.json
git commit -q -m "VERSION $new"
git tag -a "$tag" -m "VERSION $new"
git push -q origin "$branch"
git push -q origin "$tag"

printf '\033[32m✓\033[0m pushed %s\n' "$tag"
echo "  build:   https://github.com/$REPO/actions/workflows/release-rust.yml"
echo "  release: https://github.com/$REPO/releases/tag/$tag (ready in ~10 min)"

if [ "$watch" = 1 ]; then
  command -v gh >/dev/null 2>&1 || err "--watch needs the gh CLI (https://cli.github.com)"
  echo "  watching the release build..."
  # Poll until the run for this tag completes (cap ~30 min).
  for _ in $(seq 1 90); do
    state="$(gh run list --repo "$REPO" --workflow release-rust.yml --limit 20 \
      --json headBranch,status,conclusion \
      --jq "[.[] | select(.headBranch == \"$tag\")][0] | .status + \":\" + (.conclusion // \"-\")" 2>/dev/null || echo "?")"
    case "$state" in
      completed:success)
        printf '\033[32m✓\033[0m release %s is live with binaries + checksums for macOS (x64/arm64), Linux (x64/arm64) and Windows (x64/arm64)\n' "$tag"
        echo "  https://github.com/$REPO/releases/tag/$tag"
        exit 0 ;;
      completed:*)
        err "release build failed: https://github.com/$REPO/actions/workflows/release-rust.yml" ;;
    esac
    sleep 20
  done
  err "timed out waiting for the release build (~30 min); check https://github.com/$REPO/actions"
fi
