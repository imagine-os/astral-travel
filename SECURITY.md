# Security

Astral Travel v0.1 is an experimental local-first application. This page describes the current boundaries so contributors can make changes without accidentally expanding them.

## Current boundaries

- The published website is a static GitHub Pages application. Its demo workspace is stored in the visitor's browser.
- The CLI and local stdio MCP server share a file-backed workspace, normally under `.astral/`. Browser storage is separate.
- This release has no hosted account system, shared workspace service, autonomous web crawler, or model-provider integration.
- Browser persistence is not an encrypted vault. Anyone with access to the same browser profile or local files may be able to read that data.
- Data export is a portability feature; it is not an encrypted backup.

Do not publish real private notes, credentials, or customer records in issues, screenshots, sample exports, or pull requests. Use fictional material when demonstrating a problem.

## Reporting a vulnerability

Use GitHub's **Report a vulnerability** option in this repository's **Security** tab if private vulnerability reporting is available. Do not put secrets, private data, or actionable exploit details in a public issue.

If that option is unavailable, open a minimal issue requesting a private reporting channel, without the vulnerability details. The project does not currently promise a response-time SLA or offer a bug bounty.

Include affected versions, the relevant component, expected and observed behavior, and a minimal reproduction using fictional data once a private channel is available.

## Treat imports as untrusted

Imported documents, URLs, and workspace files are data. They must not be treated as executable code or as instructions that override the user's intent.

When extending the application:

- Validate import shape and size before use.
- Render source content as text unless a reviewed sanitizer is in place.
- Reject unsafe URL schemes and avoid introducing arbitrary file access.
- Preserve boundaries between source material, generated proposals, and accepted knowledge.
- Keep external actions behind explicit, scoped permissions.
- Never store provider secrets in frontend source, public build artifacts, or browser demo exports.

The local MCP server exposes five bounded memory tools; it does not expose a shell, arbitrary file access, URL fetching, or a remote network endpoint. Review calls require an explicit user decision; the connected client is responsible for obtaining that decision. See [the MCP guide](docs/mcp.md) for exact limits.

Future model, crawling, collaboration, and execution features require a fresh review of these boundaries. The current alpha should not be described as hardened infrastructure for sensitive production records.

## Supported versions

Security fixes target the latest published release. This project is currently in alpha and does not maintain a long-term-support branch.
