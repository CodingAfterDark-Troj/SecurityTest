// Helpdesk Asset Manager
// WARNING: This application is INTENTIONALLY VULNERABLE for security training.
// Do not deploy it anywhere reachable by untrusted users. See VULNERABILITIES.md.

const express = require('express');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const ASSETS_FILE = path.join(DATA_DIR, 'assets.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const EXPORT_DIR = path.join(__dirname, 'exports');

const config = {
  appName: 'Helpdesk Asset Manager',
  sessionSecret: 'helpdesk-secret-2026',
  dbBackupPassword: 'Backup!Pass99',
  debug: true,
};

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));
app.use(cookieParser());

// Intentionally legacy front-end dependencies for the A06 training exercise.
// These narrowly scoped mounts avoid exposing all of node_modules.
app.use('/vendor/jquery', express.static(path.join(__dirname, 'node_modules', 'jquery', 'dist')));
app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules', 'bootstrap', 'dist')));

// ---------- JSON storage ----------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const getAssets = () => readJson(ASSETS_FILE);
const saveAssets = (assets) => writeJson(ASSETS_FILE, assets);
const getUsers = () => readJson(USERS_FILE);

// ---------- Session handling ----------

// Session token is just base64-encoded JSON of the user
function createSession(user) {
  return Buffer.from(JSON.stringify({ username: user.username, role: user.role })).toString('base64');
}

function currentUser(req) {
  if (!req.cookies.session) return null;
  try {
    return JSON.parse(Buffer.from(req.cookies.session, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function requireLogin(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.redirect('/login');
  req.user = user;
  next();
}

// ---------- HTML rendering ----------

function layout(title, body, user) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} - ${config.appName}</title>
  <link rel="stylesheet" href="/vendor/bootstrap/css/bootstrap.min.css">
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 0; background: #f4f6f8; color: #222; }
    header { background: #1f3a5f; color: #fff; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; }
    header a { color: #fff; margin-left: 16px; text-decoration: none; }
    main { max-width: 1100px; margin: 24px auto; background: #fff; padding: 24px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e3e3e3; }
    th { background: #eef2f6; }
    input, select, textarea { width: 100%; padding: 6px; margin: 4px 0 12px; box-sizing: border-box; }
    button, .btn { background: #1f3a5f; color: #fff; border: 0; padding: 8px 14px; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-danger { background: #b02a37; }
    .inline { display: inline; }
    pre { background: #111; color: #0f0; padding: 12px; overflow-x: auto; }
    .muted { color: #777; }
  </style>
</head>
<body>
  <header>
    <strong>${config.appName}</strong>
    <nav>
      ${user ? `Signed in as ${user.username} (${user.role})
      <a href="/">Assets</a>
      <a href="/assets/new">Add Asset</a>
      <a href="/tools">Tools</a>
      <a href="/logout">Logout</a>` : '<a href="/login">Login</a>'}
    </nav>
  </header>
  <main>${body}</main>
  <script src="/vendor/jquery/jquery.min.js"></script>
  <script src="/vendor/bootstrap/js/bootstrap.min.js"></script>
</body>
</html>`;
}

function assetForm(asset, action) {
  const a = asset || {};
  const statuses = ['Available', 'In Use', 'In Repair', 'Retired'];
  return `
  <form method="post" action="${action}">
    <label>Asset Tag</label><input name="tag" value="${a.tag || ''}" required>
    <label>Name</label><input name="name" value="${a.name || ''}" required>
    <label>Type</label><input name="type" value="${a.type || ''}">
    <label>Serial Number</label><input name="serial" value="${a.serial || ''}">
    <label>Assigned To</label><input name="assignedTo" value="${a.assignedTo || ''}">
    <label>Location</label><input name="location" value="${a.location || ''}">
    <label>Hostname / IP</label><input name="hostname" value="${a.hostname || ''}">
    <label>Status</label>
    <select name="status">
      ${statuses.map((s) => `<option ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}
    </select>
    <label>Notes</label><textarea name="notes" rows="4">${a.notes || ''}</textarea>
    <button type="submit">Save</button>
  </form>`;
}

// ---------- Auth routes ----------

app.get('/login', (req, res) => {
  const error = req.query.error ? `<p style="color:#b02a37">${req.query.error}</p>` : '';
  res.send(layout('Login', `
    <h2>Helpdesk Login</h2>
    ${error}
    <form method="post" action="/login" style="max-width:320px">
      <label>Username</label><input name="username">
      <label>Password</label><input name="password" type="password">
      <button type="submit">Login</button>
    </form>`, null));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();
  const user = users.find((u) => u.username === username);

  if (!user) {
    return res.redirect('/login?error=Unknown username');
  }
  if (user.password !== password) {
    return res.redirect('/login?error=Incorrect password for ' + username);
  }

  res.cookie('session', createSession(user));
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  res.clearCookie('session');
  res.redirect('/login');
});

// ---------- Asset routes ----------

// List / search assets
app.get('/', requireLogin, (req, res) => {
  const q = req.query.q || '';
  let assets = getAssets();
  if (q) {
    const term = q.toLowerCase();
    assets = assets.filter((a) =>
      Object.values(a).some((v) => String(v).toLowerCase().includes(term))
    );
  }

  const rows = assets.map((a) => `
    <tr>
      <td><a href="/assets/${a.id}">${a.tag}</a></td>
      <td>${a.name}</td>
      <td>${a.type}</td>
      <td>${a.assignedTo || '<span class="muted">-</span>'}</td>
      <td>${a.location}</td>
      <td>${a.status}</td>
      <td>
        <a class="btn" href="/assets/${a.id}/edit">Edit</a>
        <form class="inline" method="post" action="/assets/${a.id}/delete">
          <button class="btn-danger" type="submit">Delete</button>
        </form>
      </td>
    </tr>`).join('');

  res.send(layout('Assets', `
    <h2>Assets</h2>
    <form method="get" action="/">
      <input name="q" placeholder="Search assets..." value="${q}">
    </form>
    ${q ? `<p>Showing results for: <b>${q}</b></p>` : ''}
    <table>
      <tr><th>Tag</th><th>Name</th><th>Type</th><th>Assigned To</th><th>Location</th><th>Status</th><th>Actions</th></tr>
      ${rows || '<tr><td colspan="7" class="muted">No assets found</td></tr>'}
    </table>`, req.user));
});

// Add asset
app.get('/assets/new', requireLogin, (req, res) => {
  res.send(layout('Add Asset', `<h2>Add Asset</h2>${assetForm(null, '/assets')}`, req.user));
});

app.post('/assets', requireLogin, (req, res) => {
  const assets = getAssets();
  const nextId = assets.reduce((max, a) => Math.max(max, a.id), 0) + 1;
  const asset = { id: nextId, ...req.body };
  assets.push(asset);
  saveAssets(assets);
  res.redirect('/assets/' + asset.id);
});

// View asset
app.get('/assets/:id', requireLogin, (req, res) => {
  const asset = getAssets().find((a) => a.id == req.params.id);
  if (!asset) return res.status(404).send(layout('Not Found', '<h2>Asset not found</h2>', req.user));

  const fields = Object.entries(asset)
    .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
    .join('');

  res.send(layout(asset.tag, `
    <h2>${asset.tag} - ${asset.name}</h2>
    <table>${fields}</table>
    <p>
      <a class="btn" href="/assets/${asset.id}/edit">Edit</a>
      <a class="btn" href="/assets/${asset.id}/ping">Ping Device</a>
    </p>
    <form method="post" action="/assets/${asset.id}/delete">
      <button class="btn-danger" type="submit">Delete Asset</button>
    </form>`, req.user));
});

// Edit asset
app.get('/assets/:id/edit', requireLogin, (req, res) => {
  const asset = getAssets().find((a) => a.id == req.params.id);
  if (!asset) return res.status(404).send(layout('Not Found', '<h2>Asset not found</h2>', req.user));
  res.send(layout('Edit Asset', `<h2>Edit ${asset.tag}</h2>${assetForm(asset, `/assets/${asset.id}/edit`)}`, req.user));
});

app.post('/assets/:id/edit', requireLogin, (req, res) => {
  const assets = getAssets();
  const asset = assets.find((a) => a.id == req.params.id);
  if (!asset) return res.status(404).send('Asset not found');
  Object.assign(asset, req.body);
  saveAssets(assets);
  res.redirect('/assets/' + asset.id);
});

// Delete asset (admins only)
app.post('/assets/:id/delete', requireLogin, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send(layout('Forbidden', '<h2>Only admins can delete assets</h2>', req.user));
  }
  const assets = getAssets().filter((a) => a.id != req.params.id);
  saveAssets(assets);
  res.redirect('/');
});

// Ping the device's hostname to check if it's online
app.get('/assets/:id/ping', requireLogin, (req, res) => {
  const asset = getAssets().find((a) => a.id == req.params.id);
  if (!asset) return res.status(404).send('Asset not found');

  const countFlag = process.platform === 'win32' ? '-n' : '-c';
  exec(`ping ${countFlag} 1 ${asset.hostname}`, (err, stdout, stderr) => {
    res.send(layout('Ping', `
      <h2>Ping ${asset.hostname}</h2>
      <pre>${stdout}${stderr}</pre>
      <a class="btn" href="/assets/${asset.id}">Back</a>`, req.user));
  });
});

// ---------- JSON API ----------

app.get('/api/assets', (req, res) => {
  res.json(getAssets());
});

app.get('/api/assets/:id', (req, res) => {
  const asset = getAssets().find((a) => a.id == req.params.id);
  if (!asset) return res.status(404).json({ error: 'Not found' });
  res.json(asset);
});

app.delete('/api/assets/:id', (req, res) => {
  const assets = getAssets();
  const remaining = assets.filter((a) => a.id != req.params.id);
  saveAssets(remaining);
  res.json({ deleted: assets.length - remaining.length });
});

// ---------- Tools: export / import / warranty lookup ----------

app.get('/tools', requireLogin, (req, res) => {
  const files = fs.readdirSync(EXPORT_DIR)
    .map((f) => `<li><a href="/export/download?file=${f}">${f}</a></li>`)
    .join('');

  res.send(layout('Tools', `
    <h2>Export Assets</h2>
    <form method="post" action="/export">
      <label>File name</label><input name="filename" value="assets-export.json">
      <button type="submit">Export</button>
    </form>
    <h3>Existing exports</h3>
    <ul>${files}</ul>

    <h2>Import Assets</h2>
    <form method="post" action="/import">
      <label>Paste exported JSON</label>
      <textarea name="data" rows="6" placeholder='[{"tag":"HD-0100","name":"..."}]'></textarea>
      <button type="submit">Import</button>
    </form>

    <h2>Vendor Warranty Lookup</h2>
    <form method="get" action="/warranty">
      <label>Vendor warranty API URL</label>
      <input name="url" placeholder="https://vendor.example.com/warranty?serial=...">
      <button type="submit">Lookup</button>
    </form>`, req.user));
});

app.post('/export', requireLogin, (req, res) => {
  const filename = req.body.filename || 'assets-export.json';
  fs.writeFileSync(path.join(EXPORT_DIR, filename), JSON.stringify(getAssets(), null, 2));
  res.redirect('/tools');
});

app.get('/export/download', requireLogin, (req, res) => {
  res.sendFile(path.join(EXPORT_DIR, req.query.file));
});

app.post('/import', requireLogin, (req, res) => {
  // "Flexible" parser so techs can paste JS-style objects too
  const imported = eval('(' + req.body.data + ')');
  const assets = getAssets();
  let nextId = assets.reduce((max, a) => Math.max(max, a.id), 0) + 1;
  for (const item of [].concat(imported)) {
    assets.push({ ...item, id: nextId++ });
  }
  saveAssets(assets);
  res.redirect('/');
});

app.get('/warranty', requireLogin, async (req, res, next) => {
  try {
    const response = await fetch(req.query.url);
    const text = await response.text();
    res.send(layout('Warranty', `
      <h2>Warranty Lookup Result</h2>
      <p class="muted">${req.query.url}</p>
      <pre>${text}</pre>`, req.user));
  } catch (err) {
    next(err);
  }
});

// ---------- Debug ----------

app.get('/debug', (req, res) => {
  res.json({ config, env: process.env, users: getUsers() });
});

// ---------- Error handling ----------

app.use((err, req, res, next) => {
  res.status(500).send(`<h1>Internal Server Error</h1><pre>${err.stack}</pre>`);
});

app.listen(PORT, HOST, () => {
  console.log(`${config.appName} running at http://${HOST}:${PORT}`);
  console.log('WARNING: intentionally vulnerable application - training use only');
});
