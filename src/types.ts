export type FileType = 'image' | 'video' | 'audio' | 'pdf' | 'other';
export type ModifierKey = 'shift' | 'ctrl' | 'meta' | 'none';
export type DefaultDropBehavior = 'external' | 'import';

export interface ExternalFileMatch {
	fullMatch: string;
	filePath: string;
	isEmbed: boolean;
	linkText?: string;
	width?: number;
	start: number;
	end: number;
}

export interface ExternalFileLinksSettings {
	defaultDragBehavior: 'embed' | 'link';
	defaultDropAction: DefaultDropBehavior;
	alternateDropModifier: ModifierKey;
	imageMaxWidth: number;
	pdfHeight: string;
	showMissingFilePlaceholder: boolean;
}
