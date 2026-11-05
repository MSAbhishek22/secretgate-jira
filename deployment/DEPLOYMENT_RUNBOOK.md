# DEPLOYMENT RUNBOOK — SecretGate for Jira (Forge-native)

There is no separate web host. Deployment = `forge deploy` to Atlassian's
Forge runtime + `forge install` on a Jira site. The "live deployment" gate
maps to: **installed on a live Atlassian developer site, verified in a fresh
browser session, installation link working for judges.**

## Prerequisites (user's taps — NOT done)

1. Free Atlassian Cloud Developer License — sign up at
   https://developer.atlassian.com/cloud/ (free; STOP if a card is asked).
2. `forge login` with the Atlassian account, or API-token env vars
   (`FORGE_EMAIL` + `FORGE_API_TOKEN`) per
   https://go.atlassian.com/dac/platform/forge/getting-started/#log-in-with-an-atlassian-api-token
   — the token comes from the user's own Atlassian account; never share it
   in chat or commit it.
3. Devpost account + Codegeist registration (Join Hackathon).

## Sandbox findings (5 Nov 2026 — record for the next session)

- Node v24.22.1, npm 10.9.4 present.
- Forge CLI **15.0.0 runs**: installed locally in `forge-cli/` with
  `npm install @forge/cli@latest --ignore-scripts`. The default install
  FAILS in this sandbox: the `keytar` native module's postinstall runs
  `node-gyp rebuild`, which fails with `EPERM: chown/fchown` (the sandbox
  blocks chown syscalls). `--ignore-scripts` skips it and the CLI still
  runs (`forge --version` → 15.0.0).
- `/tmp` is a 512 MB tmpfs: a full `npm install @forge/cli` (~230 MB)
  filled it (ENOSPC). Install under `~/workspace` (home disk has room),
  not `/tmp`. Cleaned up after the test.
- `forge create` / `forge lint` / `forge deploy` all refuse without login:
  "Error: Not logged in. … run forge login, otherwise set environment
  variables." The interactive analytics prompt also needs a TTY — `expect`
  can drive it, or pre-answer via the config file.
- Use `HOME=/tmp/fh XDG_CONFIG_HOME=/tmp/fh/.config` (or the real home)
  when running forge commands; the CLI writes machine-id config on first run.

## Deploy steps (after login)

```bash
cd ~/workspace/hackathons/codegeist/app
../../forge-cli/node_modules/.bin/forge register   # assigns real app.id; update manifest.yml
../../forge-cli/node_modules/.bin/forge lint       # must be clean
../../forge-cli/node_modules/.bin/forge deploy     # deploys to development env
../../forge-cli/node_modules/.bin/forge install --demo-site
# → install on a seeded demo Jira site (active 90 days), or:
../../forge-cli/node_modules/.bin/forge install    # pick the dev site
```

**Known gap before first deploy:** `manifest.yml` points the `ledger`
resource at `static/ledger/build`, which does not exist until Phase 3.
Either build the Custom UI ledger first, or temporarily repoint the
`ledger` resource at the UI Kit resource. Do not hide this — fix it
explicitly at Phase 3 start.

## Judge installation link

After install, create the sharing/installation link per
https://developer.atlassian.com/platform/forge/distribute-your-apps/#start-sharing-your-app
and paste it + step-by-step judge instructions into the Devpost submission.
Verify the link works from a logged-out / fresh browser session on the demo
site before recording the video.

## Rollback

- `forge deploy -e production` only after the dev install is verified.
- `forge uninstall` removes the app from a site.
- Every deploy is tied to a GitHub commit — record the commit SHA +
  Forge deployment id in `deployment/RELEASE_MANIFEST.json` (create at
  Phase 5; file does not exist yet because there is no deployment yet).

## Environment variables (names only — never values)

- `FORGE_EMAIL`, `FORGE_API_TOKEN` — CLI login only, set in the user's own
  shell, never committed.
- No app runtime secrets: the app uses Forge storage + Jira API only.
