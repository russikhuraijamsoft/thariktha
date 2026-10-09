import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';

let driveAccessTokenCache: string | null = null;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
}

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file'
];

/**
 * Acquire Google OAuth Access Token with Drive Scopes
 */
export async function authenticateGoogleDrive(): Promise<string> {
  try {
    const provider = new GoogleAuthProvider();
    GOOGLE_DRIVE_SCOPES.forEach(scope => provider.addScope(scope));
    
    // Prompt consent to ensure token with drive permissions is granted
    provider.setCustomParameters({ prompt: 'consent' });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential || !credential.accessToken) {
      throw new Error("Could not retrieve Google OAuth access token for Drive.");
    }

    driveAccessTokenCache = credential.accessToken;
    return driveAccessTokenCache;
  } catch (error: any) {
    console.error("Google Drive OAuth Auth Error:", error);
    throw error;
  }
}

export function getCachedDriveToken(): string | null {
  return driveAccessTokenCache;
}

export function setCachedDriveToken(token: string | null) {
  driveAccessTokenCache = token;
}

/**
 * List files and folders from Google Drive
 */
export async function listDriveFiles(
  token: string, 
  options?: { folderId?: string; searchQuery?: string; mimeTypeFilter?: string }
): Promise<DriveFileItem[]> {
  try {
    const qParts: string[] = ['trashed = false'];

    if (options?.folderId) {
      qParts.push(`'${options.folderId}' in parents`);
    }

    if (options?.searchQuery && options.searchQuery.trim() !== '') {
      const sanitized = options.searchQuery.replace(/'/g, "\\'");
      qParts.push(`name contains '${sanitized}'`);
    }

    if (options?.mimeTypeFilter) {
      if (options.mimeTypeFilter === 'folder') {
        qParts.push(`mimeType = 'application/vnd.google-apps.folder'`);
      } else if (options.mimeTypeFilter === 'document') {
        qParts.push(`mimeType contains 'document' or mimeType contains 'pdf' or mimeType contains 'sheet'`);
      } else if (options.mimeTypeFilter === 'image') {
        qParts.push(`mimeType contains 'image/'`);
      }
    }

    const queryStr = encodeURIComponent(qParts.join(' and '));
    const fields = encodeURIComponent('files(id, name, mimeType, webViewLink, thumbnailLink, iconLink, size, createdTime, modifiedTime, parents)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${queryStr}&fields=${fields}&pageSize=100&orderBy=folder,name`;

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Google Drive API error (${res.status})`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err: any) {
    console.error("Failed to fetch Google Drive files:", err);
    throw err;
  }
}

/**
 * Create a Folder in Google Drive
 */
export async function createDriveFolder(
  token: string, 
  folderName: string, 
  parentId?: string
): Promise<DriveFileItem> {
  const metadata: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to create folder in Google Drive');
  }

  return await res.json();
}

/**
 * Upload a File to Google Drive (Multipart)
 */
export async function uploadFileToDrive(
  token: string,
  file: File | Blob,
  fileName: string,
  parentId?: string,
  description?: string
): Promise<DriveFileItem> {
  const metadata: any = {
    name: fileName,
    mimeType: file.type || 'application/octet-stream',
    description: description || 'Uploaded via Cricket Closet ERP'
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const formData = new FormData();
  formData.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  formData.append('file', file);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,thumbnailLink,size,createdTime', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to upload file to Google Drive');
  }

  return await res.json();
}

/**
 * Delete a file or folder from Google Drive
 */
export async function deleteDriveFile(token: string, fileId: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to delete file from Google Drive');
  }

  return true;
}
