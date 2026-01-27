import { ExternalFileLinksSettings, FileAccessError, FileErrorType } from './types';
import { getFileType, getFileName, pathToFileUrl, createBlobUrl, fileExists, createFileAccessError, createMediaError } from './utils';
import { selectExternalFile } from './dialog';
import { shell } from 'electron';

export interface RenderOptions {
	filePath: string;
	width?: number;
	isEmbed: boolean;
	linkText?: string;
	settings: ExternalFileLinksSettings;
	// Callbacks for missing file actions
	onRetry?: () => void;
	onRelocate?: (newPath: string) => void;
}

interface MissingFilePlaceholderOptions {
	filePath: string;
	error?: FileAccessError;
	onRetry?: () => void;
	onRelocate?: (newPath: string) => void;
}

interface ManagedContainer {
	container: HTMLDivElement;
	abortController: AbortController;
}

function createManagedContainer(...classes: string[]): ManagedContainer {
	const container = document.createElement('div');
	container.addClass(...classes);
	const abortController = new AbortController();

	// Abort when container is removed from DOM
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const removedNode of mutation.removedNodes) {
				if (removedNode === container || removedNode.contains(container)) {
					abortController.abort();
					observer.disconnect();
					return;
				}
			}
		}
	});

	// Start observing when container is added to DOM
	requestAnimationFrame(() => {
		if (container.parentElement) {
			observer.observe(container.parentElement, { childList: true, subtree: true });
		}
	});

	return { container, abortController };
}

// Generic media embed configuration
interface MediaEmbedConfig<T extends HTMLElement> {
	containerClasses: string[];
	loadingMessage: string;
	createElement: (blobUrl: string, filePath: string, signal: AbortSignal) => T;
	getError: (element: T, filePath: string) => FileAccessError;
}

// Generic factory for creating media embeds
function createMediaEmbed<T extends HTMLElement>(
	config: MediaEmbedConfig<T>,
	filePath: string,
	onRelocate?: (newPath: string) => void
): HTMLElement {
	const { container, abortController } = createManagedContainer('external-file-embed', ...config.containerClasses);
	const signal = abortController.signal;

	const load = () => {
		if (signal.aborted) return;
		container.empty();
		const loading = document.createElement('div');
		loading.addClass('external-file-loading');
		loading.textContent = config.loadingMessage;
		container.appendChild(loading);

		createBlobUrl(filePath).then((blobUrl) => {
			if (signal.aborted) return;
			container.empty();

			const element = config.createElement(blobUrl, filePath, signal);
			element.addEventListener('error', () => {
				showError(config.getError(element, filePath));
			}, { signal });

			container.appendChild(element);
		}).catch((error: FileAccessError) => {
			if (signal.aborted) return;
			showError(error);
		});
	};

	const showError = (error?: FileAccessError) => {
		if (signal.aborted) return;
		container.empty();
		container.appendChild(createMissingFilePlaceholder({
			filePath,
			error,
			onRetry: load,
			onRelocate,
		}));
	};

	load();
	return container;
}

export function renderExternalFile(options: RenderOptions): HTMLElement {
	const { filePath, width, isEmbed, linkText, settings, onRelocate } = options;

	// Don't pre-check file existence (fs doesn't work reliably in Obsidian)
	// Instead, rely on error handlers in the HTML elements

	if (!isEmbed) {
		return createClickableLink(filePath, linkText);
	}

	const fileType = getFileType(filePath);

	switch (fileType) {
		case 'image':
			return createImageEmbed(filePath, width, settings, onRelocate);
		case 'video':
			return createVideoEmbed(filePath, settings, onRelocate);
		case 'audio':
			return createAudioEmbed(filePath, onRelocate);
		case 'pdf':
			return createPdfEmbed(filePath, settings, onRelocate);
		default:
			return createClickableLink(filePath, linkText);
	}
}

function createImageEmbed(
	filePath: string,
	width: number | undefined,
	settings: ExternalFileLinksSettings,
	onRelocate?: (newPath: string) => void
): HTMLElement {
	return createMediaEmbed<HTMLImageElement>(
		{
			containerClasses: ['external-file-image'],
			loadingMessage: 'Loading...',
			createElement: (blobUrl, path) => {
				const img = document.createElement('img');
				img.src = blobUrl;
				img.alt = getFileName(path);
				if (width) {
					img.style.maxWidth = `${width}px`;
				} else if (settings.imageMaxWidth > 0) {
					img.style.maxWidth = `${settings.imageMaxWidth}px`;
				}
				return img;
			},
			getError: (_, path) => createFileAccessError(path, { code: 'ENOENT' }),
		},
		filePath,
		onRelocate
	);
}

function createVideoEmbed(
	filePath: string,
	settings: ExternalFileLinksSettings,
	onRelocate?: (newPath: string) => void
): HTMLElement {
	return createMediaEmbed<HTMLVideoElement>(
		{
			containerClasses: ['external-file-video'],
			loadingMessage: 'Loading video...',
			createElement: (blobUrl) => {
				const video = document.createElement('video');
				video.src = blobUrl;
				video.controls = true;
				video.preload = 'metadata';
				return video;
			},
			getError: (element, path) => createMediaError(path, element.error),
		},
		filePath,
		onRelocate
	);
}

function createAudioEmbed(
	filePath: string,
	onRelocate?: (newPath: string) => void
): HTMLElement {
	return createMediaEmbed<HTMLAudioElement>(
		{
			containerClasses: ['external-file-audio'],
			loadingMessage: 'Loading audio...',
			createElement: (blobUrl) => {
				const audio = document.createElement('audio');
				audio.src = blobUrl;
				audio.controls = true;
				audio.preload = 'metadata';
				return audio;
			},
			getError: (element, path) => createMediaError(path, element.error),
		},
		filePath,
		onRelocate
	);
}

function createPdfEmbed(
	filePath: string,
	settings: ExternalFileLinksSettings,
	onRelocate?: (newPath: string) => void
): HTMLElement {
	return createMediaEmbed<HTMLObjectElement>(
		{
			containerClasses: ['external-file-pdf'],
			loadingMessage: 'Loading PDF...',
			createElement: (blobUrl, path, signal) => {
				const object = document.createElement('object');
				object.data = blobUrl;
				object.type = 'application/pdf';
				object.style.width = '100%';
				object.style.height = settings.pdfHeight;

				// Fallback content if PDF can't be displayed
				const fallback = document.createElement('p');
				fallback.textContent = 'PDF cannot be displayed. ';
				const link = document.createElement('a');
				link.href = '#';
				link.textContent = 'Click to open';
				link.addEventListener('click', (evt) => {
					evt.preventDefault();
					openExternalFile(path);
				}, { signal });
				fallback.appendChild(link);
				object.appendChild(fallback);

				return object;
			},
			getError: (_, path) => createFileAccessError(path, { code: 'ENOENT' }),
		},
		filePath,
		onRelocate
	);
}

function createClickableLink(filePath: string, linkText?: string): HTMLElement {
	const container = document.createElement('span');
	container.addClass('external-file-link');

	const link = document.createElement('a');
	link.addClass('external-link');
	link.textContent = linkText || getFileName(filePath);
	link.href = '#';
	link.title = `Open ${filePath}`;

	link.addEventListener('click', (evt) => {
		evt.preventDefault();
		openExternalFile(filePath);
	});

	// Add file icon
	const icon = document.createElement('span');
	icon.addClass('external-file-icon');
	icon.innerHTML = getFileIcon(filePath);

	container.appendChild(icon);
	container.appendChild(link);

	return container;
}

function getErrorIcon(type?: FileErrorType): string {
	switch (type) {
		case 'not-mounted':    return '💿';
		case 'permission':     return '🔒';
		case 'io-error':       return '⚡';
		case 'invalid-path':   return '🚫';
		case 'decode-error':   return '🔧';
		case 'format-error':   return '📦';
		case 'network-error':  return '🌐';
		case 'aborted':        return '⏹️';
		default:               return '⚠️';
	}
}

function getErrorHint(type?: FileErrorType): string {
	switch (type) {
		case 'not-mounted':
			return 'Connect the drive and click Retry';
		case 'permission':
			return 'Check file permissions or run Obsidian with appropriate access';
		case 'io-error':
			return 'Check if the drive is connected and working properly';
		case 'invalid-path':
			return 'The file path may be incorrect';
		case 'not-found':
			return 'The file may have been moved or deleted';
		case 'decode-error':
			return 'The file may be corrupted or use an unsupported codec';
		case 'format-error':
			return 'This media format is not supported by your browser';
		case 'network-error':
			return 'A network error occurred while loading the file';
		case 'aborted':
			return 'Media loading was interrupted. Click Retry to try again';
		default:
			return '';
	}
}

function revealInFileManager(filePath: string): void {
	shell.showItemInFolder(filePath);
}

function createMissingFilePlaceholder(options: MissingFilePlaceholderOptions): HTMLElement {
	const { filePath, error, onRetry, onRelocate } = options;
	const fileNameStr = getFileName(filePath);

	// Generate unique ID for ARIA references
	const uniqueId = `ext-file-error-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

	const container = document.createElement('div');
	container.addClass('external-file-missing');
	container.setAttribute('role', 'alert');

	// Header row: icon + message
	const header = document.createElement('div');
	header.addClass('external-file-missing-header');

	const icon = document.createElement('span');
	icon.addClass('external-file-missing-icon');
	icon.innerHTML = getErrorIcon(error?.type);

	const message = document.createElement('span');
	message.addClass('external-file-missing-message');
	message.id = `${uniqueId}-msg`;
	message.textContent = error?.message ?? 'File not found';

	header.appendChild(icon);
	header.appendChild(message);

	// File info
	const fileInfo = document.createElement('div');
	fileInfo.addClass('external-file-missing-info');

	const fileName = document.createElement('span');
	fileName.addClass('external-file-missing-filename');
	fileName.textContent = fileNameStr;

	const path = document.createElement('span');
	path.addClass('external-file-missing-path');
	path.textContent = filePath;

	fileInfo.appendChild(fileName);
	fileInfo.appendChild(path);

	// Hint text
	const hint = document.createElement('div');
	hint.addClass('external-file-missing-hint');
	hint.textContent = getErrorHint(error?.type);

	// Action buttons row
	const actions = document.createElement('div');
	actions.addClass('external-file-missing-actions');
	actions.setAttribute('role', 'group');
	actions.setAttribute('aria-label', 'File recovery actions');

	// Retry button
	if (onRetry) {
		const retryBtn = document.createElement('button');
		retryBtn.addClass('external-file-action-btn');
		retryBtn.textContent = 'Retry';
		retryBtn.title = 'Try loading the file again';
		retryBtn.setAttribute('aria-label', `Retry loading ${fileNameStr}`);
		retryBtn.setAttribute('aria-describedby', `${uniqueId}-msg`);
		retryBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			onRetry();
		});
		actions.appendChild(retryBtn);
	}

	// Reveal in Finder button
	const revealBtn = document.createElement('button');
	revealBtn.addClass('external-file-action-btn');
	revealBtn.textContent = 'Show Folder';
	revealBtn.title = 'Open parent folder in file manager';
	revealBtn.setAttribute('aria-label', `Show folder containing ${fileNameStr}`);
	revealBtn.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		revealInFileManager(filePath);
	});
	actions.appendChild(revealBtn);

	// Relocate button
	if (onRelocate) {
		const relocateBtn = document.createElement('button');
		relocateBtn.addClass('external-file-action-btn');
		relocateBtn.textContent = 'Relocate';
		relocateBtn.title = 'Select new file location';
		relocateBtn.setAttribute('aria-label', `Select new location for ${fileNameStr}`);
		relocateBtn.setAttribute('aria-describedby', `${uniqueId}-msg`);
		relocateBtn.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			const newPath = await selectExternalFile('Select New File Location');
			if (newPath) {
				onRelocate(newPath);
			}
		});
		actions.appendChild(relocateBtn);
	}

	container.appendChild(header);
	container.appendChild(fileInfo);
	if (hint.textContent) {
		container.appendChild(hint);
	}
	container.appendChild(actions);

	return container;
}

function getFileIcon(filePath: string): string {
	const fileType = getFileType(filePath);
	switch (fileType) {
		case 'image':
			return '🖼️';
		case 'video':
			return '🎬';
		case 'audio':
			return '🎵';
		case 'pdf':
			return '📄';
		default:
			return '📎';
	}
}

export function openExternalFile(filePath: string): void {
	shell.openPath(filePath);
}
