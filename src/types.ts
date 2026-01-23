export type FileType = 'image' | 'video' | 'audio' | 'pdf' | 'other';
export type ModifierKey = 'shift' | 'ctrl' | 'meta' | 'none';
export type DefaultDropBehavior = 'external' | 'import';

export type FileErrorType =
	| 'not-found'      // ENOENT - file doesn't exist
	| 'not-mounted'    // ENODEV, ENXIO - volume/device not available
	| 'permission'     // EACCES, EPERM - access denied
	| 'io-error'       // EIO - read/write error
	| 'invalid-path'   // ENOTDIR, EISDIR, EINVAL - path problems
	| 'unknown';

export interface FileAccessError {
	type: FileErrorType;
	code?: string;
	message: string;
	filePath: string;
}

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
	logLevel: 'debug' | 'info' | 'warn' | 'error' | 'none';
}
