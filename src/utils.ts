import { FileType, ExternalFileMatch } from './types';
import { Platform } from 'obsidian';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'tif'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv', 'm4v'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus'];
const PDF_EXTENSIONS = ['pdf'];

export const EXT_PROTOCOL = 'ext://';

// Regex patterns for parsing external file syntax
// Embed pattern: ![ext:///path/to/file] or ![ext:///path/to/file|width]
export const EMBED_PATTERN = /!\[ext:\/\/([^\]|]+)(?:\|(\d+))?\]/g;

// Link pattern: [text](ext:///path/to/file)
export const LINK_PATTERN = /\[([^\]]*)\]\(ext:\/\/([^)]+)\)/g;

// Combined pattern for finding all external file references
export const COMBINED_PATTERN = /(?:!\[ext:\/\/([^\]|]+)(?:\|(\d+))?\]|\[([^\]]*)\]\(ext:\/\/([^)]+)\))/g;

export function getFileExtension(filePath: string): string {
	const parts = filePath.split('.');
	if (parts.length < 2) return '';
	return parts[parts.length - 1].toLowerCase();
}

export function getFileType(filePath: string): FileType {
	const ext = getFileExtension(filePath);

	if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
	if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
	if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
	if (PDF_EXTENSIONS.includes(ext)) return 'pdf';
	return 'other';
}

export function pathToFileUrl(absolutePath: string): string {
	// Normalize path separators to forward slashes
	let normalizedPath = absolutePath.replace(/\\/g, '/');

	// Ensure path starts with a slash (for Mac/Linux) or handle Windows drive letters
	if (Platform.isWin) {
		// Windows: C:\Users\... -> file:///C:/Users/...
		if (/^[A-Za-z]:/.test(normalizedPath)) {
			normalizedPath = '/' + normalizedPath;
		}
	}

	// Use Obsidian's app:// protocol which has proper local file access permissions
	// This avoids Chromium's file:// security restrictions
	return 'app://local' + normalizedPath;
}

export function fileUrlToPath(fileUrl: string): string {
	// Remove file:// prefix
	let path = fileUrl.replace(/^file:\/\//, '');

	// Decode URI components
	path = decodeURIComponent(path);

	// On Windows, remove leading slash before drive letter
	if (Platform.isWin && /^\/[A-Za-z]:/.test(path)) {
		path = path.substring(1);
	}

	return path;
}

export function createEmbedSyntax(filePath: string, width?: number): string {
	const widthSuffix = width ? `|${width}` : '';
	return `![ext://${filePath}${widthSuffix}]`;
}

export function createLinkSyntax(filePath: string, linkText?: string): string {
	const text = linkText || getFileName(filePath);
	return `[${text}](ext://${filePath})`;
}

export function getFileName(filePath: string): string {
	const parts = filePath.replace(/\\/g, '/').split('/');
	return parts[parts.length - 1] || filePath;
}

export function parseExternalFileReferences(text: string): ExternalFileMatch[] {
	const matches: ExternalFileMatch[] = [];

	// Reset regex state
	COMBINED_PATTERN.lastIndex = 0;

	let match;
	while ((match = COMBINED_PATTERN.exec(text)) !== null) {
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

export function getMimeType(filePath: string): string {
	const ext = getFileExtension(filePath);
	const mimeTypes: Record<string, string> = {
		// Images
		'png': 'image/png',
		'jpg': 'image/jpeg',
		'jpeg': 'image/jpeg',
		'gif': 'image/gif',
		'svg': 'image/svg+xml',
		'webp': 'image/webp',
		'bmp': 'image/bmp',
		'ico': 'image/x-icon',
		'tiff': 'image/tiff',
		'tif': 'image/tiff',
		// Videos
		'mp4': 'video/mp4',
		'webm': 'video/webm',
		'mov': 'video/quicktime',
		'avi': 'video/x-msvideo',
		'mkv': 'video/x-matroska',
		'ogv': 'video/ogg',
		'm4v': 'video/x-m4v',
		// Audio
		'mp3': 'audio/mpeg',
		'wav': 'audio/wav',
		'ogg': 'audio/ogg',
		'm4a': 'audio/mp4',
		'flac': 'audio/flac',
		'aac': 'audio/aac',
		'wma': 'audio/x-ms-wma',
		'opus': 'audio/opus',
		// Documents
		'pdf': 'application/pdf',
	};
	return mimeTypes[ext] || 'application/octet-stream';
}

// Cache for blob URLs to avoid re-reading files
const blobUrlCache = new Map<string, string>();

export async function createBlobUrl(filePath: string): Promise<string> {
	// Check cache first
	if (blobUrlCache.has(filePath)) {
		return blobUrlCache.get(filePath)!;
	}

	try {
		const fs = require('fs').promises;
		const buffer = await fs.readFile(filePath);
		const mimeType = getMimeType(filePath);
		const blob = new Blob([buffer], { type: mimeType });
		const url = URL.createObjectURL(blob);

		// Cache the URL
		blobUrlCache.set(filePath, url);

		return url;
	} catch (error) {
		console.error('[ExternalFileLinks] Failed to read file:', filePath, error);
		throw error;
	}
}

export function fileExists(filePath: string): Promise<boolean> {
	return new Promise((resolve) => {
		const fs = require('fs');
		fs.access(filePath, fs.constants.F_OK, (err: any) => {
			resolve(!err);
		});
	});
}
