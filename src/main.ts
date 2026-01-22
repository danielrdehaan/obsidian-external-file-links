import { Plugin } from 'obsidian';
import { ExternalFileLinksSettings } from './types';
import { DEFAULT_SETTINGS } from './settings';
import { DragDropHandler } from './DragDropHandler';
import { ReadingViewRenderer } from './ReadingViewRenderer';
import { createLivePreviewExtension } from './LivePreviewExtension';
import { ExternalFileLinksSettingTab } from './SettingsTab';
import { createEmbedSyntax, createLinkSyntax } from './utils';

export default class ExternalFileLinksPlugin extends Plugin {
	settings: ExternalFileLinksSettings;
	private dragDropHandler: DragDropHandler;
	private readingViewRenderer: ReadingViewRenderer;

	async onload(): Promise<void> {
		await this.loadSettings();

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
				const filePath = await this.selectExternalFile();
				if (filePath) {
					editor.replaceSelection(createEmbedSyntax(filePath));
				}
			},
		});

		this.addCommand({
			id: 'insert-external-file-link',
			name: 'Insert external file (link)',
			editorCallback: async (editor) => {
				const filePath = await this.selectExternalFile();
				if (filePath) {
					editor.replaceSelection(createLinkSyntax(filePath));
				}
			},
		});

		console.log('External File Links plugin loaded');
	}

	onunload(): void {
		console.log('External File Links plugin unloaded');
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);

		// Update handlers with new settings
		this.dragDropHandler.updateSettings(this.settings);
		this.readingViewRenderer.updateSettings(this.settings);
	}

	private async selectExternalFile(): Promise<string | null> {
		// Use Electron's dialog to select a file
		try {
			// Try to get the dialog module from electron remote
			let dialog;
			try {
				const electron = require('electron');
				dialog = electron.remote?.dialog;
			} catch {
				// Fallback to @electron/remote if available
			}

			if (!dialog) {
				try {
					const remote = require('@electron/remote');
					dialog = remote.dialog;
				} catch {
					console.error('Could not access Electron dialog');
					return null;
				}
			}

			const result = await dialog.showOpenDialog({
				properties: ['openFile'],
				title: 'Select External File',
			});

			if (result.canceled || result.filePaths.length === 0) {
				return null;
			}

			return result.filePaths[0];
		} catch (error) {
			console.error('Failed to open file dialog:', error);
			return null;
		}
	}
}
