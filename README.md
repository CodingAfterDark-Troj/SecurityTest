# Helpdesk Asset Manager

> ⚠️ **This application is intentionally vulnerable.** It exists for security training only.
> Run it on your own machine, never on a shared network or the public internet, and never put real data in it.

Helpdesk Asset Manager is a small, deliberately insecure web app for practicing web application security testing. It looks like an internal IT tool that a helpdesk team might use to track laptops, monitors, printers and other hardware. Behind that it contains a set of planted flaws, mapped to common categories from the [OWASP Top 10](https://owasp.org/www-project-top-ten/), for you to find, exploit and explain.

The code is kept minimal on purpose: one Express server file, JSON files for storage, and no build step. That keeps the attack surface easy to read and the app quick to reset.

## What the app does

Once signed in, a helpdesk user can:

- **Browse and search assets**: a table of every tracked device with its tag, name, type, assignee, location and status.
- **Add, edit and delete assets**: record serial numbers, hostnames/IPs, locations and notes. Deleting is meant to be limited to admins.
- **Ping a device**: check whether an asset's hostname responds on the network.
- **Export and import**: save the asset list to a JSON file, download earlier exports, or paste JSON back in to bulk-import assets.
- **Look up vendor warranties**: fetch warranty details from a vendor API URL.
- **Use a JSON API**: `/api/assets` endpoints for listing, viewing and deleting assets from scripts.

Three roles exist: `admin`, `tech` and `viewer`.

## Getting started

### Requirements

- [Node.js](https://nodejs.org/) 18 or later (the warranty lookup uses the built-in `fetch`)

### Run it

```bash
npm install
npm start
```

Then open <http://127.0.0.1:3000>.

On Windows you can use the helper script instead, which installs dependencies on first run:

```bat
start.bat            :: interactive menu
start.bat start      :: or: stop | restart | status
```

### Configuration

| Variable | Default     | Purpose             |
|----------|-------------|---------------------|
| `HOST`   | `127.0.0.1` | Interface to bind   |
| `PORT`   | `3000`      | Port to listen on   |

Keep `HOST` on `127.0.0.1` unless you are on an isolated lab network.

### Starting account

Sign in as `viewer` / `viewer123`, the lowest-privilege role. Other accounts exist; finding a way to them is part of the exercise.

## Training goals

Work through the app as you would on a real assessment:

1. Map every page, form, parameter and API endpoint.
2. Find each flaw and confirm it with a working proof of concept.
3. Rate its impact, and note which OWASP Top 10 category it belongs to.
4. Write up a fix, then try patching `server.js` and confirm your exploit no longer works.

The flaws span areas such as authentication, session handling, access control, injection, input handling, sensitive data exposure, outdated components and server configuration. Some are obvious and some are not.

An answer key (`VULNERABILITIES.md`) is kept separately for instructors.

## Resetting the lab

All state lives in `data/assets.json` and `data/users.json`, and exports are written to `exports/`. To reset, restore those files from git:

```bash
git checkout -- data exports
git clean -fd exports
```

## Packaging for students

`package.ps1` builds a zip in `dist/` containing just the files needed to run the lab:

```powershell
powershell -ExecutionPolicy Bypass -File package.ps1                     # student build
powershell -ExecutionPolicy Bypass -File package.ps1 -IncludeAnswerKey   # adds VULNERABILITIES.md
```

## Project layout

```
server.js          Express app: all routes and rendering
data/              JSON "database" (assets and users)
exports/           Where asset exports are written
start.bat          Windows start/stop/status helper
package.ps1        Builds a distributable zip into dist/
```

## Disclaimer

This software is provided for education in a controlled environment. Only test systems you own or have explicit permission to test. The authors take no responsibility for misuse.
