import { Plugin, MarkdownView } from 'obsidian';
import { ExternalFileLinksSettings } from './types';
import { DEFAULT_SETTINGS } from './settings';
import { DragDropHandler } from './DragDropHandler';
import { ReadingViewRenderer } from './ReadingViewRenderer';
import { createLivePreviewExtension } from './LivePreviewExtension';
import { ExternalFileLinksSettingTab } from './SettingsTab';
import { createEmbedSyntax, createLinkSyntax, clearBlobUrlCache } from './utils';
import { selectExternalFile } from './dialog';
import { logger } from './logger';

export default class ExternalFileLinksPlugin extends Plugin {
	settings: ExternalFileLinksSettings;
	private dragDropHandler: DragDropHandler;
	private readingViewRenderer: ReadingViewRenderer;

	async onload(): Promise<void> {
		await this.loadSettings();
		logger.setLevel(this.settings.logLevel);

		// Initialize handlers
		this.dragDropHandler = new DragDropHandler(this, this.settings);
		this.readingViewRenderer = new ReadingViewRenderer(this, this.settings);

		// Register handlers
		this.dragDropHandler.register();
		this.readingViewRenderer.register();

		// Register CodeMirror 6 extension for live preview
		this.registerEditorExtension(createLivePreviewExtension(() => this.settings));

		// Register settings tab
		this.addSettingTab(new ExternalFileLinksSettingTab(this.app, this));

		// Register commands
		this.addCommand({
			id: 'insert-external-file-embed',
			name: 'Insert external file (embed)',
			editorCallback: async (editor) => {
				const filePath = await selectExternalFile();
				if (filePath) {
					editor.replaceSelection(createEmbedSyntax(filePath));
				}
			},
		});

		this.addCommand({
			id: 'insert-external-file-link',
			name: 'Insert external file (link)',
			editorCallback: async (editor) => {
				const filePath = await selectExternalFile();
				if (filePath) {
					editor.replaceSelection(createLinkSyntax(filePath));
				}
			},
		});

		this.addCommand({
			id: 'reload-external-files',
			name: 'Reload external files',
			callback: () => this.reloadExternalFiles(),
		});

		logger.info('Plugin loaded');
	}

	onunload(): void {
		clearBlobUrlCache();
		logger.info('Plugin unloaded');
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);

		// Update handlers with new settings
		this.dragDropHandler.updateSettings(this.settings);
		this.readingViewRenderer.updateSettings(this.settings);
		logger.setLevel(this.settings.logLevel);
	}

	/**
	 * Reloads all external files by clearing the cache and refreshing all views.
	 * Useful after mounting an external drive or NAS that was unavailable.
	 */
	private reloadExternalFiles(): void {
		// Clear the blob URL cache so files are re-read from disk
		clearBlobUrlCache();

		// Refresh all open markdown views
		this.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView) {
				const view = leaf.view as MarkdownView;

				// For reading mode: re-render the preview
				if (view.getMode() === 'preview') {
					// Get the preview section and trigger a re-render
					const previewMode = (view as any).previewMode;
					if (previewMode?.rerender) {
						previewMode.rerender(true);
					}
				}

				// For live preview / source mode: trigger editor update
				const editor = view.editor;
				if (editor) {
					// Access the underlying CodeMirror EditorView
					const cm = (editor as any).cm as import('@codemirror/view').EditorView;
					if (cm) {
						// Dispatch a no-op transaction to force decoration rebuild
						cm.dispatch({
							effects: [],
						});
					}
				}
			}
		});

		logger.info('Reloaded external files');
	}
}
