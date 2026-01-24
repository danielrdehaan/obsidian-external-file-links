import { Editor, MarkdownView, Plugin, WorkspaceLeaf } from 'obsidian';
import { ExternalFileLinksSettings, ModifierCombo, DropInsertStyle } from './types';
import { createEmbedSyntax, createLinkSyntax, createRawPathSyntax, getFileType } from './utils';
import { logger } from './logger';

// Get file path using Electron's webUtils (for newer Electron versions)
function getFilePath(file: File): string | undefined {
	try {
		// Try the newer Electron webUtils API first
		const { webUtils } = require('electron');
		if (webUtils?.getPathForFile) {
			return webUtils.getPathForFile(file);
		}
	} catch {
		// Fallback for older versions
	}

	// Fallback to the old path property
	return (file as any).path;
}

export class DragDropHandler {
	private plugin: Plugin;
	private settings: ExternalFileLinksSettings;

	constructor(plugin: Plugin, settings: ExternalFileLinksSettings) {
		this.plugin = plugin;
		this.settings = settings;
	}

	updateSettings(settings: ExternalFileLinksSettings): void {
		this.settings = settings;
	}

	register(): void {
		// Use DOM event listener in capture phase to intercept before Obsidian
		this.plugin.registerDomEvent(
			window,
			'drop',
			this.handleDrop.bind(this),
			true // capture phase
		);

		// Also need dragover to allow drop
		this.plugin.registerDomEvent(
			window,
			'dragover',
			(evt: DragEvent) => {
				// Check if dragging files from outside
				if (evt.dataTransfer?.types?.includes('Files')) {
					logger.debug('Dragover with files');
				}
			},
			true
		);
	}

	private handleDrop(evt: DragEvent): void {
		logger.debug('Drop event captured');

		// Only handle drops on editor elements
		const target = evt.target as HTMLElement;
		logger.debug('Target:', target?.className);
		if (!target?.closest('.cm-editor')) {
			logger.debug('Not in editor, skipping');
			return;
		}

		const files = evt.dataTransfer?.files;
		logger.debug('Files count:', files?.length);
		if (!files || files.length === 0) {
			return;
		}

		// Check if these are external files (have an absolute path)
		const externalFiles: { file: File; path: string }[] = [];
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const filePath = getFilePath(file);
			logger.debug('File:', {
				name: file.name,
				path: filePath,
				type: file.type,
				size: file.size
			});
			// External files dragged from Finder/Explorer have an absolute path
			if (filePath && (filePath.startsWith('/') || /^[A-Za-z]:/.test(filePath))) {
				externalFiles.push({ file, path: filePath });
			}
		}

		logger.debug('External files count:', externalFiles.length);
		if (externalFiles.length === 0) {
			return;
		}

		// Check if import modifier combo is held - if so, let Obsidian handle it
		if (this.isComboHeld(evt, this.settings.importModifier)) {
			logger.debug('Import modifier combo held, letting Obsidian handle import');
			return;
		}

		// Determine if default is external or import
		const defaultIsExternal = this.settings.defaultDropAction === 'external';

		// If default is import and no style modifier is held, let Obsidian handle it
		if (!defaultIsExternal && !this.isAnyStyleModifierHeld(evt)) {
			logger.debug('Default is import and no style modifier held, letting Obsidian handle import');
			return;
		}

		// Prevent Obsidian's default handling
		evt.preventDefault();
		evt.stopPropagation();

		// Get the active editor
		const activeLeaf = this.plugin.app.workspace.activeLeaf;
		if (!activeLeaf) return;

		const view = activeLeaf.view;
		if (!(view instanceof MarkdownView)) return;

		const editor = view.editor;
		if (!editor) return;

		// Determine insert style based on modifier keys (priority: raw > link > embed > default)
		const insertStyle = this.getInsertStyle(evt);
		logger.debug('Insert style:', insertStyle);

		// Build syntax for all dropped files
		const syntaxParts: string[] = [];
		for (const { path: filePath } of externalFiles) {
			const fileType = getFileType(filePath);

			if (insertStyle === 'raw') {
				syntaxParts.push(createRawPathSyntax(filePath));
			} else if (insertStyle === 'link' || fileType === 'other') {
				syntaxParts.push(createLinkSyntax(filePath));
			} else {
				syntaxParts.push(createEmbedSyntax(filePath));
			}
		}

		const syntax = syntaxParts.join('\n');

		// Insert at drop position or cursor position
		// Try to get drop position from the event
		const dropPos = this.getDropPosition(evt, editor, view);
		if (dropPos !== null) {
			editor.setCursor(dropPos);
		}

		editor.replaceSelection(syntax);
	}

	/**
	 * Check if the given modifier combo is enabled (has at least one key set)
	 */
	private isComboEnabled(combo: ModifierCombo): boolean {
		return combo.shift || combo.ctrl || combo.meta || combo.alt;
	}

	/**
	 * Check if the exact modifier combo is held (exact match - no extra keys)
	 */
	private isComboHeld(evt: DragEvent, combo: ModifierCombo): boolean {
		// A combo with all keys false = disabled (never matches)
		if (!this.isComboEnabled(combo)) {
			return false;
		}

		logger.debug('Checking combo:', combo);
		logger.debug('Event keys:', {
			shiftKey: evt.shiftKey,
			ctrlKey: evt.ctrlKey,
			metaKey: evt.metaKey,
			altKey: evt.altKey
		});

		// Exact match: all required keys must be held AND no extra modifier keys
		const result = (
			evt.shiftKey === combo.shift &&
			evt.ctrlKey === combo.ctrl &&
			evt.metaKey === combo.meta &&
			evt.altKey === combo.alt
		);

		logger.debug('Combo match result:', result);
		return result;
	}

	private isAnyStyleModifierHeld(evt: DragEvent): boolean {
		return (
			this.isComboHeld(evt, this.settings.embedModifier) ||
			this.isComboHeld(evt, this.settings.linkModifier) ||
			this.isComboHeld(evt, this.settings.rawPathModifier)
		);
	}

	private getInsertStyle(evt: DragEvent): DropInsertStyle {
		// Check modifiers in priority order: raw > link > embed
		// This allows combining modifiers predictably
		if (this.isComboHeld(evt, this.settings.rawPathModifier)) {
			return 'raw';
		}
		if (this.isComboHeld(evt, this.settings.linkModifier)) {
			return 'link';
		}
		if (this.isComboHeld(evt, this.settings.embedModifier)) {
			return 'embed';
		}
		// Fall back to default style
		return this.settings.defaultInsertStyle;
	}

	private getDropPosition(evt: DragEvent, editor: Editor, view: MarkdownView): { line: number; ch: number } | null {
		// Try to convert drop coordinates to editor position
		try {
			const editorView = (editor as any).cm as any;
			if (editorView?.posAtCoords) {
				const pos = editorView.posAtCoords({ x: evt.clientX, y: evt.clientY });
				if (pos !== null) {
					const line = editorView.state.doc.lineAt(pos);
					return {
						line: line.number - 1,
						ch: pos - line.from
					};
				}
			}
		} catch {
			// Fall back to current cursor position
		}
		return null;
	}
}
