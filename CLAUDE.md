# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

External File Links is an Obsidian plugin that enables users to reference external files using `ext://` protocol links, with inline previews for images, PDFs, audio, and video. Files stay in their original location rather than being copied into the vault.

## Build Commands

```bash
npm run dev      # Watch mode with esbuild (inline sourcemaps)
npm run build    # Production build (minified, no sourcemaps)
```

Output files (`main.js`, `manifest.json`, `styles.css`) go to the vault's `.obsidian/plugins/external-file-links/` folder for testing.

## Architecture

### Core Components

The plugin follows a handler-based architecture with clear separation of concerns:

- **`main.ts`** - Plugin entry point. Initializes handlers, registers commands, manages settings lifecycle.

- **`DragDropHandler.ts`** - Intercepts drag-drop events in capture phase. Uses exact modifier key matching (shift/ctrl/meta/alt combos) to determine insertion style (embed, link, or raw path). Priority system: raw > link > embed > default.

- **`FileRenderer.ts`** - Creates DOM elements for different file types (image, video, audio, PDF). Handles blob URL creation from disk files, error states with semantic error types (not-found, not-mounted, permission, io-error), and missing file placeholder UI with retry/relocation options.

- **`LivePreviewExtension.ts`** - CodeMirror 6 ViewPlugin for live preview mode. ExternalFileWidget renders embeds/links inline, with smart widget hiding when cursor is inside the syntax. Uses reload token mechanism for cache invalidation.

- **`ReadingViewRenderer.ts`** - MarkdownPostProcessor for reading mode. Processes img and anchor HTML elements, replacing Obsidian-parsed patterns with external file renderers.

- **`SettingsTab.ts`** - Settings UI using Obsidian's Setting component.

- **`utils.ts`** - Regex-based syntax parsing, file type detection, blob URL caching with revocation, reload token system, error code mapping.

### Key Patterns

- **Modifier key matching**: Exact match required - all specified keys must be pressed, no extra keys allowed
- **Blob URL caching**: URLs are cached and revoked when no longer needed to prevent memory leaks
- **Reload tokens**: Global token incremented to invalidate cached content across all views
- **Settings propagation**: Handlers receive settings updates via `updateSettings()` callbacks

### Syntax Format

```markdown
![ext:///path/to/file.png]        # Embed
![ext:///path/to/file.png|400]    # Embed with width
[Label](ext:///path/to/file.pdf)  # Link
```

### Obsidian Integration Points

- Electron's `fs.promises` and `webUtils` APIs for file access
- CodeMirror 6 extensions via `registerEditorExtension`
- Markdown post-processors via `registerMarkdownPostProcessor`
- Settings storage via `loadData`/`saveData`
- Commands via `addCommand`
