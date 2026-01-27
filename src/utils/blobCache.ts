import { logger } from '../logger';
import { getMimeType } from './fileTypes';
import { createFileAccessError } from './errors';

// LRU Cache for blob URLs with size limits
interface BlobCacheEntry {
	url: string;
	size: number;
	lastAccessed: number;
}

const blobUrlCache = new Map<string, BlobCacheEntry>();
let currentCacheSize = 0;
const MAX_ENTRIES = 100;
const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

function evictLRU(): void {
	if (blobUrlCache.size === 0) return;

	let oldestKey: string | null = null;
	let oldestTime = Infinity;
	for (const [key, entry] of blobUrlCache.entries()) {
		if (entry.lastAccessed < oldestTime) {
			oldestTime = entry.lastAccessed;
			oldestKey = key;
		}
	}
	if (oldestKey) {
		const entry = blobUrlCache.get(oldestKey)!;
		URL.revokeObjectURL(entry.url);
		currentCacheSize -= entry.size;
		blobUrlCache.delete(oldestKey);
		logger.debug('Evicted blob cache entry:', oldestKey);
	}
}

// Token that changes when external files should be reloaded
// Used to force widget recreation in live preview
let reloadToken = 0;

/**
 * Gets the current reload token. Used by widgets to track when a reload is requested.
 */
export function getReloadToken(): number {
	return reloadToken;
}

/**
 * Clears the blob URL cache, allowing files to be re-read from disk.
 * This is useful when external drives are mounted after the initial load.
 * Also increments the reload token to force widget recreation.
 */
export function clearBlobUrlCache(): void {
	// Revoke all existing blob URLs to free memory
	for (const entry of blobUrlCache.values()) {
		URL.revokeObjectURL(entry.url);
	}
	blobUrlCache.clear();
	currentCacheSize = 0;

	// Increment reload token to force widget recreation
	reloadToken++;
}

export async function createBlobUrl(filePath: string): Promise<string> {
	// Check cache first
	const cached = blobUrlCache.get(filePath);
	if (cached) {
		// Update last accessed time for LRU
		cached.lastAccessed = Date.now();
		return cached.url;
	}

	try {
		const fs = require('fs').promises;
		const buffer = await fs.readFile(filePath);
		const mimeType = getMimeType(filePath);
		const blob = new Blob([buffer], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const size = buffer.length;

		// Evict entries if cache is at limits
		while (blobUrlCache.size >= MAX_ENTRIES || currentCacheSize + size > MAX_SIZE_BYTES) {
			if (blobUrlCache.size === 0) break;
			evictLRU();
		}

		// Cache the URL with metadata
		blobUrlCache.set(filePath, {
			url,
			size,
			lastAccessed: Date.now(),
		});
		currentCacheSize += size;

		return url;
	} catch (error) {
		logger.error('Failed to read file:', filePath, error);
		throw createFileAccessError(filePath, error);
	}
}
