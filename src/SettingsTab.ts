import { App, PluginSettingTab, Setting } from 'obsidian';
import { ExternalFileLinksSettings, ModifierKey } from './types';
import ExternalFileLinksPlugin from './main';
import { logger, LogLevel } from './logger';

export class ExternalFileLinksSettingTab extends PluginSettingTab {
	plugin: ExternalFileLinksPlugin;

	constructor(app: App, plugin: ExternalFileLinksPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'External File Links Settings' });

		// Drop Behavior section
		containerEl.createEl('h3', { text: 'Drop Behavior' });

		new Setting(containerEl)
			.setName('Default drop action')
			.setDesc('What happens when you drop an external file without holding any modifier keys.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('external', 'External file link')
					.addOption('import', 'Import to vault')
					.setValue(this.plugin.settings.defaultDropAction)
					.onChange(async (value) => {
						this.plugin.settings.defaultDropAction = value as 'external' | 'import';
						await this.plugin.saveSettings();
						// Refresh to update the modifier description
						this.display();
					})
			);

		const modifierDesc = this.plugin.settings.defaultDropAction === 'external'
			? 'Hold this key while dropping to import the file into your vault instead.'
			: 'Hold this key while dropping to create an external file link instead.';

		new Setting(containerEl)
			.setName('Alternate action modifier')
			.setDesc(modifierDesc)
			.addDropdown((dropdown) =>
				dropdown
					.addOption('shift', 'Shift')
					.addOption('ctrl', 'Ctrl/Cmd')
					.addOption('meta', 'Meta (Cmd/Win)')
					.addOption('none', 'None (disabled)')
					.setValue(this.plugin.settings.alternateDropModifier)
					.onChange(async (value) => {
						this.plugin.settings.alternateDropModifier = value as ModifierKey;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('External link style')
			.setDesc('When creating external links, use embed (inline preview) or link (clickable). Hold Alt/Option while dropping to use the opposite style.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('embed', 'Embed (inline preview)')
					.addOption('link', 'Link (clickable)')
					.setValue(this.plugin.settings.defaultDragBehavior)
					.onChange(async (value) => {
						this.plugin.settings.defaultDragBehavior = value as 'embed' | 'link';
						await this.plugin.saveSettings();
					})
			);

		// Display section
		containerEl.createEl('h3', { text: 'Display' });

		new Setting(containerEl)
			.setName('Maximum image width')
			.setDesc('Maximum width for embedded images in pixels. Set to 0 for no limit.')
			.addText((text) =>
				text
					.setPlaceholder('0')
					.setValue(String(this.plugin.settings.imageMaxWidth))
					.onChange(async (value) => {
						const numValue = parseInt(value, 10);
						this.plugin.settings.imageMaxWidth = isNaN(numValue) ? 0 : Math.max(0, numValue);
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('PDF embed height')
			.setDesc('Height for embedded PDFs. Use CSS units (e.g., 600px, 80vh).')
			.addText((text) =>
				text
					.setPlaceholder('600px')
					.setValue(this.plugin.settings.pdfHeight)
					.onChange(async (value) => {
						this.plugin.settings.pdfHeight = value || '600px';
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('Show missing file placeholder')
			.setDesc('Display a placeholder when the referenced file cannot be found.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showMissingFilePlaceholder)
					.onChange(async (value) => {
						this.plugin.settings.showMissingFilePlaceholder = value;
						await this.plugin.saveSettings();
					})
			);

		containerEl.createEl('h3', { text: 'Usage' });

		const usageEl = containerEl.createEl('div', { cls: 'external-file-links-usage' });
		usageEl.createEl('p', {
			text: 'Drag files from Finder/Explorer into your notes to create external file references.',
		});

		usageEl.createEl('h4', { text: 'Syntax' });
		const syntaxList = usageEl.createEl('ul');
		syntaxList.createEl('li', { text: 'Embed: ![ext:///path/to/file.png]' });
		syntaxList.createEl('li', { text: 'Embed with width: ![ext:///path/to/file.png|400]' });
		syntaxList.createEl('li', { text: 'Link: [Display Text](ext:///path/to/file.pdf)' });

		usageEl.createEl('h4', { text: 'Keyboard Modifiers' });
		const modList = usageEl.createEl('ul');

		// Show configured alternate action modifier
		const modifier = this.plugin.settings.alternateDropModifier;
		if (modifier !== 'none') {
			const modifierName = this.getModifierDisplayName(modifier);
			const alternateAction = this.plugin.settings.defaultDropAction === 'external'
				? 'Import file into vault'
				: 'Create external file link';
			modList.createEl('li', { text: `${modifierName} + Drop: ${alternateAction}` });
		}

		modList.createEl('li', { text: 'Alt/Option + Drop: Toggle between embed and link style' });

		// Advanced section
		containerEl.createEl('h3', { text: 'Advanced' });

		new Setting(containerEl)
			.setName('Log level')
			.setDesc('Control console logging verbosity (for debugging)')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('none', 'None')
					.addOption('error', 'Errors only')
					.addOption('warn', 'Warnings & errors')
					.addOption('info', 'Info & above')
					.addOption('debug', 'Debug (verbose)')
					.setValue(this.plugin.settings.logLevel)
					.onChange(async (value) => {
						this.plugin.settings.logLevel = value as LogLevel;
						await this.plugin.saveSettings();
						logger.setLevel(value as LogLevel);
					})
			);
	}

	private getModifierDisplayName(modifier: ModifierKey): string {
		switch (modifier) {
			case 'shift': return 'Shift';
			case 'ctrl': return 'Ctrl/Cmd';
			case 'meta': return 'Meta (Cmd/Win)';
			default: return modifier;
		}
	}
}
