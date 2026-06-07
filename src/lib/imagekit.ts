import ImageKit, { toFile } from '@imagekit/nodejs';

let _client: InstanceType<typeof ImageKit> | null = null;

const MAX_IMAGEKIT_UPLOAD_BYTES = 5 * 1024 * 1024;
const IMAGEKIT_ROOT_FOLDER = 'ghib-ai';

export type ImageKitFolderKind = 'originals' | 'generated' | 'thumbnails' | 'temp';

export function isImageKitConfigured() {
  return Boolean(process.env.IMAGEKIT_PRIVATE_KEY);
}

export function safeFolderSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
}

export function buildUserImageKitFolder(userId: string, kind: ImageKitFolderKind) {
  return `${IMAGEKIT_ROOT_FOLDER}/users/${safeFolderSegment(userId)}/${kind}`;
}

function validateUploadSize(buffer: Buffer) {
  if (buffer.byteLength > MAX_IMAGEKIT_UPLOAD_BYTES) {
    throw new Error('ImageKit upload exceeds the 5MB backend limit.');
  }
}

function validateFolder(folder: string) {
  if (!folder.startsWith(`${IMAGEKIT_ROOT_FOLDER}/users/`)) {
    throw new Error('ImageKit uploads must use the ghib-ai user folder structure.');
  }
}

function getClient() {
  if (!process.env.IMAGEKIT_PRIVATE_KEY) {
    throw new Error('IMAGEKIT_PRIVATE_KEY is not configured.');
  }

  if (!_client) {
    _client = new ImageKit({
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    });
  }

  return _client;
}

function getImageKitUrlEndpoint() {
  return process.env.IMAGEKIT_URL_ENDPOINT?.replace(/\/+$/, '');
}

export function isImageKitUrl(url: string) {
  const endpoint = getImageKitUrlEndpoint();

  if (!endpoint) {
    return false;
  }

  return url.startsWith(`${endpoint}/`) || url === endpoint;
}

export function isUserImageKitUrl(url: string, userId: string) {
  const endpoint = getImageKitUrlEndpoint();

  if (!endpoint || !isImageKitUrl(url)) {
    return false;
  }

  try {
    const parsedUrl = new URL(url);
    const parsedEndpoint = new URL(endpoint);
    const userFolder = `${IMAGEKIT_ROOT_FOLDER}/users/${safeFolderSegment(userId)}/`;

    return parsedUrl.origin === parsedEndpoint.origin && decodeURIComponent(parsedUrl.pathname).includes(userFolder);
  } catch {
    return false;
  }
}

export function buildImageKitThumbnailUrl(url: string, width = 200) {
  if (!isImageKitUrl(url)) {
    return url;
  }

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}tr=w-${width},q-70,f-webp`;
}

export async function uploadBufferToImageKit(params: {
  buffer: Buffer;
  fileName: string;
  folder?: string;
  userId?: string;
  folderKind?: ImageKitFolderKind;
  mimeType: string;
}) {
  const folder =
    params.folder ??
    (params.userId ? buildUserImageKitFolder(params.userId, params.folderKind ?? 'temp') : undefined);

  if (!folder) {
    throw new Error('ImageKit upload requires a folder or userId.');
  }

  validateUploadSize(params.buffer);
  validateFolder(folder);

  const client = getClient();
  const file = await toFile(params.buffer, params.fileName, { type: params.mimeType });

  const result = await client.files.upload({
    file,
    fileName: params.fileName,
    folder,
    useUniqueFileName: true,
  });

  return { url: result.url!, fileId: result.fileId!, fileSize: params.buffer.byteLength };
}

export async function uploadRemoteImageToImageKit(params: {
  imageUrl: string;
  userId: string;
  fileName: string;
  folderKind: ImageKitFolderKind;
}) {
  const response = await fetch(params.imageUrl);

  if (!response.ok) {
    throw new Error(`Unable to download image for ImageKit upload: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? 'image/png';
  const buffer = Buffer.from(await response.arrayBuffer());

  return uploadBufferToImageKit({
    buffer,
    fileName: params.fileName,
    userId: params.userId,
    folderKind: params.folderKind,
    mimeType: contentType,
  });
}

export async function deleteImageKitFiles(fileIds: string[]) {
  const uniqueFileIds = Array.from(new Set(fileIds.filter(Boolean)));

  if (uniqueFileIds.length === 0 || !isImageKitConfigured()) {
    return;
  }

  const client = getClient();
  const results = await Promise.allSettled(uniqueFileIds.map((fileId) => client.files.delete(fileId)));
  const failures = results.filter((result) => result.status === 'rejected');

  if (failures.length > 0) {
    console.error(`Failed to delete ${failures.length} ImageKit file(s).`, failures);
  }
}
