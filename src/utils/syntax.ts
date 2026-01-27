import { ExternalFileMatch } from '../types';
import { getFileName } from './paths';

export const EXT_PROTOCOL = 'ext://';

// Regex patterns for parsing external file syntax
// Embed pattern: ![ext:///path/to/file] or ![ext:///path/to/file|width]
export const EMBED_PATTERN = /!\[ext:\/\/([^\]|]+)(?:\|(\d+))?\]/g;

// Link pattern: [text](ext:///path/to/file)
export const LINK_PATTERN = /\[([^\]]*)\]\(ext:\/\/([^)]+)\)/g;

// Combined pattern for finding all external file references
export const COMBINED_PATTERN = /(?:!\[ext:\/\/([^\]|]+)(?:\|(\d+))?\]|\[([^\]]*)\]\(ext:\/\/([^)]+)\))/g;

export function createEmbedSyntax(filePath: string, width?: number): string {
	const widthSuffix = width ? `|${width}` : '';
	return `![ext://${filePath}${widthSuffix}]`;
}

export function createLinkSyntax(filePath: string, linkText?: string): string {
	const text = linkText || getFileName(filePath);
	return `[${text}](ext://${filePath})`;
}

export function createRawPathSyntax(filePath: string): string {
	return `ext://${filePath}`;
}

export function parseExternalFileReferences(text: string): ExternalFileMatch[] {
	const matches: ExternalFileMatch[] = [];

	// Create local copy to avoid race condition with shared lastIndex
	const pattern = new RegExp(COMBINED_PATTERN.source, COMBINED_PATTERN.flags);

	let match;
	while ((match = pattern.exec(text)) !== null) {
		if (match[1] !== undefined) {
			// Embed match: ![ext:///path] or ![ext:///path|width]
			matches.push({
				fullMatch: match[0],
				filePath: match[1],
				isEmbed: true,
				width: match[2] ? parseInt(match[2], 10) : undefined,
				start: match.index,
				end: match.index + match[0].length,
			});
		} else if (match[4] !== undefined) {
			// Link match: [text](ext:///path)
			matches.push({
				fullMatch: match[0],
				filePath: match[4],
				isEmbed: false,
				linkText: match[3],
				start: match.index,
				end: match.index + match[0].length,
			});
		}
	}

	return matches;
}
