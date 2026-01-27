import { FileAccessError } from '../types';

export function createFileAccessError(filePath: string, error: any): FileAccessError {
	const code = error?.code;
	switch (code) {
		case 'ENOENT':
			return { type: 'not-found', code, filePath, message: 'File not found' };
		case 'ENODEV':
		case 'ENXIO':
			return { type: 'not-mounted', code, filePath, message: 'Volume not mounted' };
		case 'EACCES':
		case 'EPERM':
			return { type: 'permission', code, filePath, message: 'Permission denied' };
		case 'EIO':
			return { type: 'io-error', code, filePath, message: 'Error reading file' };
		case 'ENOTDIR':
		case 'EISDIR':
		case 'EINVAL':
			return { type: 'invalid-path', code, filePath, message: 'Invalid path' };
		default:
			return { type: 'unknown', code, filePath, message: 'Unable to access file' };
	}
}

export function createMediaError(filePath: string, mediaError: MediaError | null): FileAccessError {
	if (!mediaError) {
		return { type: 'unknown', filePath, message: 'Unknown media error' };
	}

	switch (mediaError.code) {
		case MediaError.MEDIA_ERR_ABORTED:
			return { type: 'aborted', filePath, message: 'Media loading was aborted' };
		case MediaError.MEDIA_ERR_NETWORK:
			return { type: 'network-error', filePath, message: 'Network error while loading media' };
		case MediaError.MEDIA_ERR_DECODE:
			return { type: 'decode-error', filePath, message: 'Media decoding failed' };
		case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
			return { type: 'format-error', filePath, message: 'Media format not supported' };
		default:
			return { type: 'unknown', filePath, message: mediaError.message || 'Unknown media error' };
	}
}
