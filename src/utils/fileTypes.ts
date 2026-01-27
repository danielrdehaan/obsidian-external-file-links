import { FileType } from '../types';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico', 'tiff', 'tif'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv', 'm4v'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus'];
const PDF_EXTENSIONS = ['pdf'];

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
