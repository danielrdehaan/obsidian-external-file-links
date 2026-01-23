import { ExternalFileLinksSettings, FileAccessError, FileErrorType } from './types';
import { getFileType, getFileName, pathToFileUrl, createBlobUrl, fileExists, createFileAccessError } from './utils';
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
	const container = document.createElement('div');
	container.addClass('external-file-embed', 'external-file-image');

	const loadImage = () => {
		container.empty();
		const loading = document.createElement('div');
		loading.addClass('external-file-loading');
		loading.textContent = 'Loading...';
		container.appendChild(loading);

		createBlobUrl(filePath).then((blobUrl) => {
			container.empty();

			const img = document.createElement('img');
			img.src = blobUrl;
			img.alt = getFileName(filePath);

			// Apply width from syntax or settings
			if (width) {
				img.style.maxWidth = `${width}px`;
			} else if (settings.imageMaxWidth > 0) {
				img.style.maxWidth = `${settings.imageMaxWidth}px`;
			}

			img.addEventListener('error', () => {
				showError(createFileAccessError(filePath, { code: 'ENOENT' }));
			});

			container.appendChild(img);
		}).catch((error: FileAccessError) => {
			showError(error);
		});
	};

	const showError = (error?: FileAccessError) => {
		container.empty();
		container.appendChild(createMissingFilePlaceholder({
			filePath,
			error,
			onRetry: loadImage,
			onRelocate,
		}));
	};

	loadImage();
	return container;
}

function createVideoEmbed(
	filePath: string,
	settings: ExternalFileLinksSettings,
	onRelocate?: (newPath: string) => void
): HTMLElement {
	const container = document.createElement('div');
	container.addClass('external-file-embed', 'external-file-video');

	const loadVideo = () => {
		container.empty();
		const loading = document.createElement('div');
		loading.addClass('external-file-loading');
		loading.textContent = 'Loading video...';
		container.appendChild(loading);

		createBlobUrl(filePath).then((blobUrl) => {
			container.empty();

			const video = document.createElement('video');
			video.src = blobUrl;
			video.controls = true;
			video.preload = 'metadata';

			video.addEventListener('error', () => {
				showError(createFileAccessError(filePath, { code: 'ENOENT' }));
			});

			container.appendChild(video);
		}).catch((error: FileAccessError) => {
			showError(error);
		});
	};

	const showError = (error?: FileAccessError) => {
		container.empty();
		container.appendChild(createMissingFilePlaceholder({
			filePath,
			error,
			onRetry: loadVideo,
			onRelocate,
		}));
	};

	loadVideo();
	return container;
}

function createAudioEmbed(
	filePath: string,
	onRelocate?: (newPath: string) => void
): HTMLElement {
	const container = document.createElement('div');
	container.addClass('external-file-embed', 'external-file-audio');

	const loadAudio = () => {
		container.empty();
		const loading = document.createElement('div');
		loading.addClass('external-file-loading');
		loading.textContent = 'Loading audio...';
		container.appendChild(loading);

		createBlobUrl(filePath).then((blobUrl) => {
			container.empty();

			const audio = document.createElement('audio');
			audio.src = blobUrl;
			audio.controls = true;
			audio.preload = 'metadata';

			audio.addEventListener('error', () => {
				showError(createFileAccessError(filePath, { code: 'ENOENT' }));
			});

			container.appendChild(audio);
		}).catch((error: FileAccessError) => {
			showError(error);
		});
	};

	const showError = (error?: FileAccessError) => {
		container.empty();
		container.appendChild(createMissingFilePlaceholder({
			filePath,
			error,
			onRetry: loadAudio,
			onRelocate,
		}));
	};

	loadAudio();
	return container;
}

function createPdfEmbed(
	filePath: string,
	settings: ExternalFileLinksSettings,
	onRelocate?: (newPath: string) => void
): HTMLElement {
	const container = document.createElement('div');
	container.addClass('external-file-embed', 'external-file-pdf');

	const loadPdf = () => {
		container.empty();
		const loading = document.createElement('div');
		loading.addClass('external-file-loading');
		loading.textContent = 'Loading PDF...';
		container.appendChild(loading);

		createBlobUrl(filePath).then((blobUrl) => {
			container.empty();

			// Use object tag for PDFs as it handles blob URLs better
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
				openExternalFile(filePath);
			});
			fallback.appendChild(link);
			object.appendChild(fallback);

			container.appendChild(object);
		}).catch((error: FileAccessError) => {
			showError(error);
		});
	};

	const showError = (error?: FileAccessError) => {
		container.empty();
		container.appendChild(createMissingFilePlaceholder({
			filePath,
			error,
			onRetry: loadPdf,
			onRelocate,
		}));
	};

	loadPdf();
	return container;
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
		case 'not-mounted': return '💿';
		case 'permission':  return '🔒';
		case 'io-error':    return '⚡';
		case 'invalid-path': return '🚫';
		default:            return '⚠️';
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
		default:
			return '';
	}
}

function revealInFileManager(filePath: string): void {
	shell.showItemInFolder(filePath);
}

async function selectFile(): Promise<string | null> {
	// Use Electron dialog
	let dialog;
	try {
		const electron = require('electron');
		dialog = electron.remote?.dialog;
	} catch { }

	if (!dialog) {
		try {
			const remote = require('@electron/remote');
			dialog = remote.dialog;
		} catch {
			return null;
		}
	}

	const result = await dialog.showOpenDialog({
		properties: ['openFile'],
		title: 'Select New File Location',
	});

	if (result.canceled || result.filePaths.length === 0) {
		return null;
	}
	return result.filePaths[0];
}

function createMissingFilePlaceholder(options: MissingFilePlaceholderOptions): HTMLElement {
	const { filePath, error, onRetry, onRelocate } = options;

	const container = document.createElement('div');
	container.addClass('external-file-missing');

	// Header row: icon + message
	const header = document.createElement('div');
	header.addClass('external-file-missing-header');

	const icon = document.createElement('span');
	icon.addClass('external-file-missing-icon');
	icon.innerHTML = getErrorIcon(error?.type);

	const message = document.createElement('span');
	message.addClass('external-file-missing-message');
	message.textContent = error?.message ?? 'File not found';

	header.appendChild(icon);
	header.appendChild(message);

	// File info
	const fileInfo = document.createElement('div');
	fileInfo.addClass('external-file-missing-info');

	const fileName = document.createElement('span');
	fileName.addClass('external-file-missing-filename');
	fileName.textContent = getFileName(filePath);

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

	// Retry button
	if (onRetry) {
		const retryBtn = document.createElement('button');
		retryBtn.addClass('external-file-action-btn');
		retryBtn.textContent = 'Retry';
		retryBtn.title = 'Try loading the file again';
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
		relocateBtn.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			const newPath = await selectFile();
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
