import { App, PluginSettingTab, Setting } from 'obsidian';
import { ExternalFileLinksSettings, ModifierCombo, DropInsertStyle } from './types';
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
						this.display();
					})
			);

		new Setting(containerEl)
			.setName('Default insert style')
			.setDesc('The default syntax style when creating external links.')
			.addDropdown((dropdown) =>
				dropdown
					.addOption('embed', 'Embed - ![ext:///path] (inline preview)')
					.addOption('link', 'Link - [name](ext:///path) (clickable)')
					.addOption('raw', 'Raw path - ext:///path (plain text)')
					.setValue(this.plugin.settings.defaultInsertStyle)
					.onChange(async (value) => {
						this.plugin.settings.defaultInsertStyle = value as DropInsertStyle;
						await this.plugin.saveSettings();
					})
			);

		// Modifier Keys section
		containerEl.createEl('h3', { text: 'Modifier Key Combinations' });
		containerEl.createEl('p', {
			text: 'Assign modifier key combinations to override the default behavior when dropping files. Toggle multiple keys to require a combination (e.g., Shift + Option).',
			cls: 'setting-item-description'
		});

		this.createModifierComboSetting(
			containerEl,
			'Import to vault',
			'Hold this combination to import the file into your vault instead of creating an external link.',
			this.plugin.settings.importModifier,
			async (combo) => {
				this.plugin.settings.importModifier = combo;
				await this.plugin.saveSettings();
				this.display();
			}
		);

		this.createModifierComboSetting(
			containerEl,
			'Insert as embed',
			'Hold this combination to insert as embed syntax: ![ext:///path] (inline preview).',
			this.plugin.settings.embedModifier,
			async (combo) => {
				this.plugin.settings.embedModifier = combo;
				await this.plugin.saveSettings();
				this.display();
			}
		);

		this.createModifierComboSetting(
			containerEl,
			'Insert as link',
			'Hold this combination to insert as link syntax: [name](ext:///path) (clickable).',
			this.plugin.settings.linkModifier,
			async (combo) => {
				this.plugin.settings.linkModifier = combo;
				await this.plugin.saveSettings();
				this.display();
			}
		);

		this.createModifierComboSetting(
			containerEl,
			'Insert as raw path',
			'Hold this combination to insert as raw path: ext:///path (no brackets).',
			this.plugin.settings.rawPathModifier,
			async (combo) => {
				this.plugin.settings.rawPathModifier = combo;
				await this.plugin.saveSettings();
				this.display();
			}
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

		// Show configured modifier key combinations
		const { importModifier, embedModifier, linkModifier, rawPathModifier } = this.plugin.settings;

		const importDisplay = this.getComboDisplayName(importModifier);
		const embedDisplay = this.getComboDisplayName(embedModifier);
		const linkDisplay = this.getComboDisplayName(linkModifier);
		const rawDisplay = this.getComboDisplayName(rawPathModifier);

		if (importDisplay) {
			modList.createEl('li', {
				text: `${importDisplay} + Drop: Import file into vault`
			});
		}
		if (embedDisplay) {
			modList.createEl('li', {
				text: `${embedDisplay} + Drop: Insert as embed (inline preview)`
			});
		}
		if (linkDisplay) {
			modList.createEl('li', {
				text: `${linkDisplay} + Drop: Insert as clickable link`
			});
		}
		if (rawDisplay) {
			modList.createEl('li', {
				text: `${rawDisplay} + Drop: Insert as raw path`
			});
		}

		if (!importDisplay && !embedDisplay && !linkDisplay && !rawDisplay) {
			modList.createEl('li', { text: 'No modifier key combinations configured' });
		}

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

	/**
	 * Get a display string for a modifier combo (e.g., "Shift + Option")
	 * Returns empty string if combo is disabled
	 */
	private getComboDisplayName(combo: ModifierCombo): string {
		const keys: string[] = [];
		if (combo.shift) keys.push('Shift');
		if (combo.ctrl) keys.push('Ctrl');
		if (combo.meta) keys.push('Cmd');
		if (combo.alt) keys.push('Option');
		return keys.join(' + ');
	}

	/**
	 * Create a setting with toggle buttons for modifier key combination
	 */
	private createModifierComboSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		combo: ModifierCombo,
		onChange: (combo: ModifierCombo) => Promise<void>
	): void {
		const setting = new Setting(containerEl)
			.setName(name)
			.setDesc(desc);

		// Create a container for the toggles
		const toggleContainer = setting.controlEl.createDiv({ cls: 'modifier-combo-toggles' });
		toggleContainer.style.display = 'flex';
		toggleContainer.style.gap = '8px';
		toggleContainer.style.alignItems = 'center';
		toggleContainer.style.flexWrap = 'wrap';

		// Helper to create a toggle button
		const createToggle = (label: string, key: keyof ModifierCombo) => {
			const btn = toggleContainer.createEl('button', {
				text: label,
				cls: combo[key] ? 'mod-cta' : ''
			});
			btn.style.minWidth = '60px';
			btn.style.padding = '4px 8px';
			btn.addEventListener('click', async () => {
				const newCombo = { ...combo, [key]: !combo[key] };
				await onChange(newCombo);
			});
		};

		createToggle('Shift', 'shift');
		createToggle('Ctrl', 'ctrl');
		createToggle('Cmd', 'meta');
		createToggle('Option', 'alt');

		// Show preview of the combination
		const preview = toggleContainer.createEl('span', {
			cls: 'modifier-combo-preview'
		});
		preview.style.marginLeft = '12px';
		preview.style.color = 'var(--text-muted)';
		preview.style.fontStyle = 'italic';

		const displayName = this.getComboDisplayName(combo);
		preview.textContent = displayName ? `(${displayName})` : '(disabled)';
	}
}
