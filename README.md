# External File Links

An Obsidian plugin that lets you reference external files from your vault using `ext://` links, with inline previews for images, PDFs, audio, and video.

## Why?

By default, Obsidian copies dropped files into your vault. This plugin gives you an alternative: create links to files that stay in their original location. This is useful when you:

- Want to reference large media files without duplicating them
- Need to link to files managed by other applications
- Want to keep your vault size small while still previewing external content

## Features

- **Drag & drop external files** to create `ext://` links
- **Inline previews** for images, videos, audio, and PDFs
- **Configurable drop behavior** - choose between external links or vault import as default
- **Modifier keys** to toggle between behaviors on the fly
- **Customizable display** - set max image width and PDF height

## Installation

### Manual Installation

1. Download the latest release from the [releases page](https://github.com/danielrdehaan/obsidian-external-file-links/releases)
2. Extract to your vault's `.obsidian/plugins/external-file-links/` folder
3. Enable the plugin in Obsidian's Community Plugins settings

### Build from Source

```bash
git clone https://github.com/danielrdehaan/obsidian-external-file-links.git
cd obsidian-external-file-links
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` to your vault's `.obsidian/plugins/external-file-links/` folder.

## Usage

### Drag & Drop

Drag files from Finder (macOS) or Explorer (Windows) into your notes. Based on your settings, this will either:
- Create an `ext://` link to the file (default)
- Import the file into your vault (Obsidian's default behavior)

### Keyboard Modifiers

| Modifier | Action |
|----------|--------|
| **None** | Use default drop action (configurable) |
| **Shift/Ctrl/Meta** | Use alternate drop action (configurable) |
| **Alt/Option** | Toggle between embed and link style |

### Syntax

You can also write `ext://` links manually:

```markdown
# Embed (inline preview)
![ext:///path/to/image.png]

# Embed with custom width
![ext:///path/to/image.png|400]

# Link (clickable)
[My Document](ext:///path/to/file.pdf)
```

### Supported File Types

| Type | Extensions | Display |
|------|------------|---------|
| Images | png, jpg, jpeg, gif, bmp, svg, webp | Inline preview |
| Video | mp4, webm, ogg, mov | Video player |
| Audio | mp3, wav, flac, aac, ogg, m4a | Audio player |
| PDF | pdf | Embedded viewer |
| Other | * | Clickable link |

## Settings

### Drop Behavior

- **Default drop action** - What happens when you drop a file without modifiers:
  - *External file link* - Creates an `ext://` reference (default)
  - *Import to vault* - Obsidian's default behavior (copies file)

- **Alternate action modifier** - Key to hold for the opposite behavior:
  - Shift, Ctrl/Cmd, Meta, or None (disabled)

- **External link style** - When creating external links:
  - *Embed* - Inline preview (default)
  - *Link* - Clickable link

### Display

- **Maximum image width** - Limit embedded image width in pixels (0 = no limit)
- **PDF embed height** - Height for embedded PDFs (e.g., `600px`, `80vh`)
- **Show missing file placeholder** - Display a placeholder when files can't be found

## License

MIT
