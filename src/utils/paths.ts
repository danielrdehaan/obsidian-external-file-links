import { Platform } from 'obsidian';

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

export function getFileName(filePath: string): string {
	const parts = filePath.replace(/\\/g, '/').split('/');
	return parts[parts.length - 1] || filePath;
}

export function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function fileExists(filePath: string): Promise<boolean> {
	return new Promise((resolve) => {
		const fs = require('fs');
		fs.access(filePath, fs.constants.F_OK, (err: any) => {
			resolve(!err);
		});
	});
}

export interface PathValidationResult {
	isValid: boolean;
	errors: string[];
}

export function validateFilePath(filePath: string): PathValidationResult {
	const errors: string[] = [];

	if (!filePath) {
		errors.push('Path is empty');
	}

	// Check for path traversal attempts
	if (/\.\.[\/\\]/.test(filePath)) {
		errors.push('Path traversal detected');
	}

	// Check for null bytes (security issue)
	if (filePath.includes('\x00')) {
		errors.push('Null byte in path');
	}

	// Check if path is absolute
	const isAbsolute = filePath.startsWith('/') || /^[A-Za-z]:/.test(filePath);
	if (!isAbsolute) {
		errors.push('Path must be absolute');
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}

export function escapePathForMarkdown(filePath: string): string {
	// Escape characters that have special meaning in markdown link/embed syntax
	return filePath.replace(/[\[\]\(\)\\|]/g, '\\$&');
}
