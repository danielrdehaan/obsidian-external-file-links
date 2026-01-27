// Re-export all utilities for backward compatibility
export { getFileExtension, getFileType, getMimeType } from './fileTypes';
export { pathToFileUrl, fileUrlToPath, getFileName, escapeRegExp, fileExists, validateFilePath, escapePathForMarkdown } from './paths';
export type { PathValidationResult } from './paths';
export {
	EXT_PROTOCOL,
	EMBED_PATTERN,
	LINK_PATTERN,
	COMBINED_PATTERN,
	createEmbedSyntax,
	createLinkSyntax,
	createRawPathSyntax,
	parseExternalFileReferences,
} from './syntax';
export { createFileAccessError, createMediaError } from './errors';
export { getReloadToken, clearBlobUrlCache, createBlobUrl } from './blobCache';
