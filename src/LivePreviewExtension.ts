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
import { COMBINED_PATTERN, parseExternalFileReferences } from './utils';

class ExternalFileWidget extends WidgetType {
	constructor(
		private filePath: string,
		private isEmbed: boolean,
		private settings: ExternalFileLinksSettings,
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
		});
	}

	eq(other: ExternalFileWidget): boolean {
		return (
			this.filePath === other.filePath &&
			this.isEmbed === other.isEmbed &&
			this.width === other.width &&
			this.linkText === other.linkText
		);
	}
}

function buildDecorations(view: EditorView, settings: ExternalFileLinksSettings): DecorationSet {
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

			constructor(view: EditorView) {
				this.decorations = buildDecorations(view, settingsGetter());
			}

			update(update: ViewUpdate): void {
				if (
					update.docChanged ||
					update.selectionSet ||
					update.viewportChanged
				) {
					this.decorations = buildDecorations(update.view, settingsGetter());
				}
			}
		},
		{
			decorations: (v) => v.decorations,
		}
	);
}
