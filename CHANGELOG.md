# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-20

### Added
- **Session ID Persistence**: Pin session UUID per `CodexClient` instance so multi-turn browsing commands (`open`, `click-link`, `find-in-page`) retain state across requests.
- **View Reference Resolution**: Automatically track citations and view refs (`turnXviewY`) returned by `open` and map original page URLs to their internal upstream view refs, allowing `click-link` and `find-in-page` to be called with either the original URL or citation handle.
- Unit tests covering `sessionId` generation and view reference resolution.

### Fixed
- **`image-search`**: Fixed result parser to extract titles, page URLs, image URLs, and descriptions from upstream `res.output` instead of relying on `res.results`.

### Removed
- **`screenshot-pdf`**: Removed tool because the upstream Codex browsing endpoint seals screenshots within encrypted ciphertext (`encrypted_output`) for ChatGPT's internal multimodal context and does not return image pixel bytes to external MCP clients.

## [1.1.2] - 2026-09-12

### Added
- Initial release of MCP server with `web-search`, `fetch`, `open-page`, `click-link`, `find-in-page`, `finance`, `weather`, `sports`, and `world-time`.
