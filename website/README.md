# fsr landing page

The landing page is a static Vite site. Its install instructions intentionally
point at the versioned GitHub Release binaries rather than the retired npm CLI.

## Local preview

```bash
cd website
yarn install --frozen-lockfile
yarn dev
```

## Production build

```bash
cd website
yarn build
```

Vite writes the deployable static files to `website/dist/`.

## Deploy to Surge

Authenticate once with a Surge account, then deploy the production build to
the project domain:

```bash
npx surge login
cd website
yarn build
npx surge dist fsr.surge.sh
```

Choose a different `<name>.surge.sh` domain if `fsr.surge.sh` is unavailable.
The deployed site needs no server-side environment variables.

## Content checklist

Before deploying, verify that the page advertises the current release, the
macOS/Linux and Windows installers, and `fsr self-update`. The release assets
and checksums are the source of truth:

https://github.com/agrublev/freedcamp-script-runner/releases/latest
