import { MarkdownPostProcessorContext, Plugin } from 'obsidian';
import { ExternalFileLinksSettings } from './types';
import { renderExternalFile } from './FileRenderer';
import { EMBED_PATTERN, LINK_PATTERN } from './utils';

export class ReadingViewRenderer {
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
		// Register post-processor for reading view
		this.plugin.registerMarkdownPostProcessor(this.postProcessor.bind(this));
	}

	private postProcessor(el: HTMLElement, ctx: MarkdownPostProcessorContext): void {
		// Process text nodes to find ext:// patterns
		this.processElement(el);
	}

	private processElement(el: HTMLElement): void {
		// Look for text content that matches our patterns
		// First, handle any img elements that Obsidian might have created from our syntax
		const images = el.querySelectorAll('img');
		images.forEach((img) => {
			const alt = img.alt || '';
			const src = img.src || '';

			// Check if this is our ext:// pattern in alt text
			// Obsidian parses ![ext:///path] and puts "ext:///path" in alt
			if (alt.startsWith('ext://')) {
				this.replaceImageWithExternalEmbed(img, alt);
			}
		});

		// Handle links that Obsidian might have created
		const links = el.querySelectorAll('a');
		links.forEach((link) => {
			const href = link.getAttribute('href') || '';
			if (href.startsWith('ext://')) {
				this.replaceLinkWithExternalLink(link, href);
			}
		});

		// Also check for any remaining text that wasn't parsed by Obsidian
		this.processTextNodes(el);
	}

	private replaceImageWithExternalEmbed(img: HTMLElement, alt: string): void {
		// Parse alt text: "ext:///path" or "ext:///path|width"
		const match = alt.match(/^ext:\/\/(.+?)(?:\|(\d+))?$/);
		if (!match) return;

		const filePath = match[1];
		const width = match[2] ? parseInt(match[2], 10) : undefined;

		const embed = renderExternalFile({
			filePath,
			width,
			isEmbed: true,
			settings: this.settings,
		});

		img.replaceWith(embed);
	}

	private replaceLinkWithExternalLink(link: HTMLElement, href: string): void {
		// Parse href: "ext:///path"
		const filePath = href.replace(/^ext:\/\//, '');
		const linkText = link.textContent || undefined;

		const externalLink = renderExternalFile({
			filePath,
			isEmbed: false,
			linkText,
			settings: this.settings,
		});

		link.replaceWith(externalLink);
	}

	private processTextNodes(el: HTMLElement): void {
		const walker = document.createTreeWalker(
			el,
			NodeFilter.SHOW_TEXT,
			null
		);

		const nodesToProcess: { node: Text; matches: Array<{ fullMatch: string; filePath: string; width?: number; isEmbed: boolean; linkText?: string }> }[] = [];

		let node: Text | null;
		while ((node = walker.nextNode() as Text | null)) {
			const text = node.textContent || '';
			const matches: Array<{ fullMatch: string; filePath: string; width?: number; isEmbed: boolean; linkText?: string }> = [];

			// Check for embed pattern
			EMBED_PATTERN.lastIndex = 0;
			let match;
			while ((match = EMBED_PATTERN.exec(text)) !== null) {
				matches.push({
					fullMatch: match[0],
					filePath: match[1],
					width: match[2] ? parseInt(match[2], 10) : undefined,
					isEmbed: true,
				});
			}

			// Check for link pattern
			LINK_PATTERN.lastIndex = 0;
			while ((match = LINK_PATTERN.exec(text)) !== null) {
				matches.push({
					fullMatch: match[0],
					filePath: match[2],
					linkText: match[1],
					isEmbed: false,
				});
			}

			if (matches.length > 0) {
				nodesToProcess.push({ node, matches });
			}
		}

		// Process collected nodes (in reverse to avoid index issues)
		for (const { node, matches } of nodesToProcess.reverse()) {
			this.replaceTextNode(node, matches);
		}
	}

	private replaceTextNode(
		node: Text,
		matches: Array<{ fullMatch: string; filePath: string; width?: number; isEmbed: boolean; linkText?: string }>
	): void {
		const text = node.textContent || '';
		const fragment = document.createDocumentFragment();

		// Sort matches by position in text
		const allMatches = matches.map(m => ({
			...m,
			index: text.indexOf(m.fullMatch),
		})).sort((a, b) => a.index - b.index);

		let lastIndex = 0;
		for (const match of allMatches) {
			// Add text before this match
			if (match.index > lastIndex) {
				fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
			}

			// Add the rendered element
			const element = renderExternalFile({
				filePath: match.filePath,
				width: match.width,
				isEmbed: match.isEmbed,
				linkText: match.linkText,
				settings: this.settings,
			});
			fragment.appendChild(element);

			lastIndex = match.index + match.fullMatch.length;
		}

		// Add remaining text
		if (lastIndex < text.length) {
			fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
		}

		node.replaceWith(fragment);
	}
}
