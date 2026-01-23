import {
	EditorView,
	Decoration,
	DecorationSet,
	WidgetType,
	ViewPlugin,
	ViewUpdate,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { editorLivePreviewField } from 'obsidian';
import { ExternalFileLinksSettings } from './types';
import { renderExternalFile } from './FileRenderer';
import { COMBINED_PATTERN, parseExternalFileReferences, getReloadToken, createEmbedSyntax, createLinkSyntax } from './utils';

class ExternalFileWidget extends WidgetType {
	constructor(
		private filePath: string,
		private isEmbed: boolean,
		private settings: ExternalFileLinksSettings,
		private reloadToken: number,
		private view: EditorView,
		private from: number,
		private to: number,
		private width?: number,
		private linkText?: string
	) {
		super();
	}

	toDOM(): HTMLElement {
		return renderExternalFile({
			filePath: this.filePath,
			width: this.width,
			isEmbed: this.isEmbed,
			linkText: this.linkText,
			settings: this.settings,
			onRelocate: (newPath) => this.handleRelocate(newPath),
		});
	}

	private handleRelocate(newPath: string): void {
		// Build new syntax
		const newSyntax = this.isEmbed
			? createEmbedSyntax(newPath, this.width)
			: createLinkSyntax(newPath, this.linkText);

		// Replace in editor
		this.view.dispatch({
			changes: { from: this.from, to: this.to, insert: newSyntax }
		});
	}

	eq(other: ExternalFileWidget): boolean {
		return (
			this.filePath === other.filePath &&
			this.isEmbed === other.isEmbed &&
			this.width === other.width &&
			this.linkText === other.linkText &&
			this.reloadToken === other.reloadToken
		);
	}
}

function buildDecorations(view: EditorView, settings: ExternalFileLinksSettings, reloadToken: number): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();

	// Check if we're in live preview mode
	const isLivePreview = view.state.field(editorLivePreviewField);
	if (!isLivePreview) {
		return builder.finish();
	}

	const doc = view.state.doc;
	const text = doc.toString();

	// Find all external file references
	const matches = parseExternalFileReferences(text);

	// Get current selection ranges
	const selection = view.state.selection;
	const cursorPositions = selection.ranges.map(r => ({ from: r.from, to: r.to }));

	// Sort matches by start position (required for RangeSetBuilder)
	matches.sort((a, b) => a.start - b.start);

	for (const match of matches) {
		// Check if cursor is inside this match
		const cursorInside = cursorPositions.some(
			cursor => cursor.from <= match.end && cursor.to >= match.start
		);

		// If cursor is inside, don't replace with widget (show raw syntax)
		if (cursorInside) {
			continue;
		}

		const widget = new ExternalFileWidget(
			match.filePath,
			match.isEmbed,
			settings,
			reloadToken,
			view,
			match.start,
			match.end,
			match.width,
			match.linkText
		);

		const decoration = Decoration.replace({
			widget,
			inclusive: false,
		});

		builder.add(match.start, match.end, decoration);
	}

	return builder.finish();
}

export function createLivePreviewExtension(settingsGetter: () => ExternalFileLinksSettings) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;
			lastReloadToken: number;

			constructor(view: EditorView) {
				this.lastReloadToken = getReloadToken();
				this.decorations = buildDecorations(view, settingsGetter(), this.lastReloadToken);
			}

			update(update: ViewUpdate): void {
				const currentToken = getReloadToken();
				const tokenChanged = currentToken !== this.lastReloadToken;

				if (
					update.docChanged ||
					update.selectionSet ||
					update.viewportChanged ||
					tokenChanged
				) {
					this.lastReloadToken = currentToken;
					this.decorations = buildDecorations(update.view, settingsGetter(), currentToken);
				}
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);
}
