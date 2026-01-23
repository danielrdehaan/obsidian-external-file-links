import { Editor, MarkdownView, Plugin, WorkspaceLeaf } from 'obsidian';
import { ExternalFileLinksSettings, ModifierKey } from './types';
import { createEmbedSyntax, createLinkSyntax, getFileType } from './utils';
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

		// Determine if we should use external link or let Obsidian import
		const useExternal = this.shouldUseExternalLink(evt);
		logger.debug('Use external link:', useExternal);

		if (!useExternal) {
			// Let Obsidian handle the import
			logger.debug('Letting Obsidian handle import');
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

		// Determine if user wants link or embed style
		// Alt/Option key toggles the default style
		const altToggled = evt.altKey;
		const defaultIsLink = this.settings.defaultDragBehavior === 'link';
		const useLink = altToggled ? !defaultIsLink : defaultIsLink;

		// Build syntax for all dropped files
		const syntaxParts: string[] = [];
		for (const { path: filePath } of externalFiles) {
			const fileType = getFileType(filePath);

			if (useLink || fileType === 'other') {
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

	private shouldUseExternalLink(evt: DragEvent): boolean {
		const defaultAction = this.settings.defaultDropAction;
		const modifier = this.settings.alternateDropModifier;

		// Check if modifier is held
		const modifierHeld = this.isModifierHeld(evt, modifier);

		// If modifier is held, do opposite of default
		if (modifierHeld) {
			return defaultAction === 'import'; // modifier flips behavior
		}

		// Otherwise, use default
		return defaultAction === 'external';
	}

	private isModifierHeld(evt: DragEvent, modifier: ModifierKey): boolean {
		if (modifier === 'none') return false;
		if (modifier === 'shift') return evt.shiftKey;
		if (modifier === 'ctrl') return evt.ctrlKey;
		if (modifier === 'meta') return evt.metaKey;
		return false;
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
