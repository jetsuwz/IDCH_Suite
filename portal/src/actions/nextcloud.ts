"use server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

function parseWebDAVXML(xml: string, requestPath: string) {
  const responseRegex = /<(?:[a-z0-9]+:)?response[\s\S]*?<\/(?:[a-z0-9]+:)?response>/gi;
  const responses = xml.match(responseRegex) || [];
  
  const items = [];
  
  for (const res of responses) {
    const hrefMatch = res.match(/<(?:[a-z0-9]+:)?href>(.*?)<\/(?:[a-z0-9]+:)?href>/i);
    const href = hrefMatch ? hrefMatch[1] : '';
    
    // Ignore the parent folder itself
    const decodedHref = decodeURIComponent(href).replace(/\/$/, '');
    const decodedReq = decodeURIComponent(requestPath).replace(/\/$/, '');
    if (decodedHref === decodedReq) continue;
    
    const name = decodedHref.split('/').filter(Boolean).pop() || '';
    
    const modifiedMatch = res.match(/<(?:[a-z0-9]+:)?getlastmodified>(.*?)<\/(?:[a-z0-9]+:)?getlastmodified>/i);
    const lastModifiedStr = modifiedMatch ? modifiedMatch[1] : '';
    
    let time = "Unknown";
    if (lastModifiedStr) {
       const date = new Date(lastModifiedStr);
       time = !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : lastModifiedStr;
    }
    
    const sizeMatch = res.match(/<(?:[a-z0-9]+:)?getcontentlength>(.*?)<\/(?:[a-z0-9]+:)?getcontentlength>/i);
    const sizeBytes = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
    const sizeStr = sizeBytes > 0 
      ? (sizeBytes > 1024 * 1024 ? (sizeBytes / 1024 / 1024).toFixed(2) + " MB" : (sizeBytes / 1024).toFixed(0) + " KB") 
      : "--";
    
    const isFolder = res.includes('<d:collection') || res.includes(':collection');
    
    let color = "text-slate-500";
    let bg = "bg-slate-50";
    if (!isFolder) {
      const lowerName = name.toLowerCase();
      if (lowerName.endsWith('.pdf')) { color = "text-red-500"; bg = "bg-red-50"; }
      else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) { color = "text-emerald-500"; bg = "bg-emerald-50"; }
      else if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) { color = "text-orange-500"; bg = "bg-orange-50"; }
      else if (lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt')) { color = "text-orange-500"; bg = "bg-orange-50"; }
      else if (lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) { color = "text-blue-600"; bg = "bg-blue-50"; }
    }
    
    const fileIdMatch = res.match(/<(?:[a-z0-9]+:)?fileid>(.*?)<\/(?:[a-z0-9]+:)?fileid>/i) || res.match(/<(?:[a-z0-9]+:)?id>(.*?)<\/(?:[a-z0-9]+:)?id>/i);
    const fileId = fileIdMatch ? fileIdMatch[1] : '';

    items.push({ name, href, time, size: sizeStr, isFolder, color, bg, fileId });
  }
  
  return {
    folders: items.filter(i => i.isFolder),
    files: items.filter(i => !i.isFolder)
  };
}

import * as http from "http";

export async function getNextcloudData(subPath: string = '/remote.php/webdav/') {
  const session = await auth();
  if (!session) return { storage: null, folders: [], files: [], error: "Not authenticated" };

  try {
    const username = "admin";
    const password = "admin"; 
    
    const body = `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:getlastmodified/>
    <d:getcontentlength/>
    <d:resourcetype/>
    <oc:id/>
    <oc:fileid/>
  </d:prop>
</d:propfind>`;

    const xml: string = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'workspace_nextcloud',
        port: 80,
        path: subPath,
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
          'Depth': '1',
          'Host': 'localhost',
          'Content-Type': 'text/xml',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 2000
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Nextcloud WebDAV error: ${res.statusCode} ${data.substring(0, 100)}`));
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.write(body);
      req.end();
    });

    const parsedData = parseWebDAVXML(xml, subPath);
    
    return {
      storage: { used: "12.45 GB", total: "50 GB", percentage: 24.9 },
      folders: parsedData.folders,
      files: parsedData.files,
      isReal: true
    };
  } catch (error) {
    console.error("Nextcloud fetch failed:", error);
    // Fallback Mock Data
    return {
      storage: { used: "12.45 GB", total: "50 GB", percentage: 24.9 },
      folders: [
        { name: "Design Assets", href: "#", time: "Unknown", size: "--", isFolder: true, color: "text-slate-500", bg: "bg-slate-50" },
        { name: "Marketing", href: "#", time: "Unknown", size: "--", isFolder: true, color: "text-slate-500", bg: "bg-slate-50" }
      ],
      files: [
        { name: "Proposal Project.pdf", time: "2 mins ago", size: "4.2 MB", color: "text-red-500", bg: "bg-red-50" },
        { name: "Invoice_2024.pdf", time: "1 hour ago", size: "12.8 MB", color: "text-red-500", bg: "bg-red-50" },
        { name: "Laporan Keuangan.xlsx", time: "3 hours ago", size: "845 KB", color: "text-emerald-500", bg: "bg-emerald-50" },
        { name: "Presentasi Q1.pptx", time: "Yesterday", size: "3.1 MB", color: "text-orange-500", bg: "bg-orange-50" }
      ],
      isMock: true
    };
  }
}

export async function uploadFileToNextcloud(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file uploaded");

  const targetPath = (formData.get("path") as string) || "/remote.php/webdav/";

  const username = "admin";
  const password = "admin";

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Encode filename safely for WebDAV path
  const safeName = encodeURIComponent(file.name);
  const uploadPath = targetPath.endsWith('/') ? `${targetPath}${safeName}` : `${targetPath}/${safeName}`;

  await new Promise<void>((resolve, reject) => {
    const options = {
      hostname: 'workspace_nextcloud',
      port: 80,
      path: uploadPath,
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        'Host': 'localhost', // Bypass Nextcloud trusted_domains
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': buffer.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${res.statusCode} ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(buffer);
    req.end();
  });

  revalidatePath("/dashboard/drive");
}

export async function createFolderNextcloud(folderName: string, currentPath: string = "/remote.php/webdav/") {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const username = "admin";
  const password = "admin";
  const safeName = encodeURIComponent(folderName);
  const targetPath = currentPath.endsWith('/') ? `${currentPath}${safeName}` : `${currentPath}/${safeName}`;

  await new Promise<void>((resolve, reject) => {
    const options = {
      hostname: 'workspace_nextcloud',
      port: 80,
      path: targetPath,
      method: 'MKCOL',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        'Host': 'localhost'
      }
    };
    const req = http.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
      else reject(new Error(`Failed to create folder: ${res.statusCode}`));
    });
    req.on('error', reject);
    req.end();
  });
  revalidatePath("/dashboard/drive");
}

export async function createTextFileNextcloud(fileName: string, currentPath: string = "/remote.php/webdav/") {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const username = "admin";
  const password = "admin";
  const safeName = encodeURIComponent(fileName.endsWith('.txt') || fileName.endsWith('.md') ? fileName : `${fileName}.txt`);
  const targetPath = currentPath.endsWith('/') ? `${currentPath}${safeName}` : `${currentPath}/${safeName}`;

  await new Promise<void>((resolve, reject) => {
    const options = {
      hostname: 'workspace_nextcloud',
      port: 80,
      path: targetPath,
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        'Host': 'localhost',
        'Content-Type': 'text/plain',
        'Content-Length': '0'
      }
    };
    const req = http.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
      else reject(new Error(`Failed to create text file: ${res.statusCode}`));
    });
    req.on('error', reject);
    req.end();
  });
  revalidatePath("/dashboard/drive");
}

export async function deleteNextcloudItem(targetPath: string) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const username = "admin";
  const password = "admin";

  await new Promise<void>((resolve, reject) => {
    const options = {
      hostname: 'workspace_nextcloud',
      port: 80,
      path: targetPath,
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        'Host': 'localhost'
      }
    };
    const req = http.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
      else reject(new Error(`Failed to delete item: ${res.statusCode}`));
    });
    req.on('error', reject);
    req.end();
  });
  revalidatePath("/dashboard/drive");
}

export async function renameNextcloudItem(targetPath: string, newName: string) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const username = "admin";
  const password = "admin";

  let parentPath = targetPath.replace(/\/$/, '');
  parentPath = parentPath.substring(0, parentPath.lastIndexOf('/')) + '/';
  const destinationPath = `${parentPath}${encodeURIComponent(newName)}`;

  await new Promise<void>((resolve, reject) => {
    const options = {
      hostname: 'workspace_nextcloud',
      port: 80,
      path: targetPath,
      method: 'MOVE',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        'Host': 'localhost',
        'Destination': `http://localhost${destinationPath}`
      }
    };
    const req = http.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
      else reject(new Error(`Failed to rename item: ${res.statusCode}`));
    });
    req.on('error', reject);
    req.end();
  });
  revalidatePath("/dashboard/drive");
}

export async function moveNextcloudItem(sourcePath: string, destFolder: string) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  const username = "admin";
  const password = "admin";

  let originalName = decodeURIComponent(sourcePath).replace(/\/$/, '').split('/').pop() || '';
  let decodedDestFolder = decodeURIComponent(destFolder);
  if (!decodedDestFolder.startsWith('/remote.php/webdav')) decodedDestFolder = '/remote.php/webdav/' + decodedDestFolder.replace(/^\/+/, '');
  if (!decodedDestFolder.endsWith('/')) decodedDestFolder += '/';
  
  let baseName = originalName;
  let ext = '';
  const copyMatch = originalName.match(/^(.*?) \(\d+\)(\.[^.]*)?$/);
  if (copyMatch) {
    baseName = copyMatch[1];
    ext = copyMatch[2] || '';
  } else if (originalName.includes('.')) {
    const lastDotIdx = originalName.lastIndexOf('.');
    baseName = originalName.substring(0, lastDotIdx);
    ext = originalName.substring(lastDotIdx);
  }

  let attempt = 0;
  while (true) {
    let itemName = originalName;
    if (attempt > 0) {
      itemName = `${baseName} (${attempt})${ext}`;
    }
    const destPath = decodedDestFolder + itemName;
    const safeDest = destPath.split('/').map(segment => encodeURIComponent(segment)).join('/');

    try {
      await new Promise<void>((resolve, reject) => {
        const options = {
          hostname: 'workspace_nextcloud',
          port: 80,
          path: sourcePath,
          method: 'MOVE',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
            'Host': 'localhost',
            'Destination': `http://localhost${safeDest}`,
            'Overwrite': 'F'
          }
        };
        const req = http.request(options, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
          else if (res.statusCode === 412) reject(new Error("EXISTS"));
          else reject(new Error(`Failed to move item: ${res.statusCode}`));
        });
        req.on('error', reject);
        req.end();
      });
      break;
    } catch (e: any) {
      if (e.message === "EXISTS") {
        attempt++;
      } else {
        throw e;
      }
    }
  }
  revalidatePath("/dashboard/drive");
}

export async function copyNextcloudItem(sourcePath: string, destFolder: string) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");
  const username = "admin";
  const password = "admin";

  let originalName = decodeURIComponent(sourcePath).replace(/\/$/, '').split('/').pop() || '';
  let decodedDestFolder = decodeURIComponent(destFolder);
  if (!decodedDestFolder.startsWith('/remote.php/webdav')) decodedDestFolder = '/remote.php/webdav/' + decodedDestFolder.replace(/^\/+/, '');
  if (!decodedDestFolder.endsWith('/')) decodedDestFolder += '/';
  
  let baseName = originalName;
  let ext = '';
  const copyMatch = originalName.match(/^(.*?) \(\d+\)(\.[^.]*)?$/);
  if (copyMatch) {
    baseName = copyMatch[1];
    ext = copyMatch[2] || '';
  } else if (originalName.includes('.')) {
    const lastDotIdx = originalName.lastIndexOf('.');
    baseName = originalName.substring(0, lastDotIdx);
    ext = originalName.substring(lastDotIdx);
  }

  let attempt = 0;
  while (true) {
    let itemName = originalName;
    if (attempt > 0) {
      itemName = `${baseName} (${attempt})${ext}`;
    }
    const destPath = decodedDestFolder + itemName;
    const safeDest = destPath.split('/').map(segment => encodeURIComponent(segment)).join('/');

    try {
      await new Promise<void>((resolve, reject) => {
        const options = {
          hostname: 'workspace_nextcloud',
          port: 80,
          path: sourcePath,
          method: 'COPY',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
            'Host': 'localhost',
            'Destination': `http://localhost${safeDest}`,
            'Overwrite': 'F'
          }
        };
        const req = http.request(options, (res) => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
          else if (res.statusCode === 412) reject(new Error("EXISTS"));
          else reject(new Error(`Failed to copy item: ${res.statusCode}`));
        });
        req.on('error', reject);
        req.end();
      });
      break;
    } catch (e: any) {
      if (e.message === "EXISTS") {
        attempt++;
      } else {
        throw e;
      }
    }
  }
  revalidatePath("/dashboard/drive");
}

export async function getNextcloudActivity(fileId: string) {
  const session = await auth();
  if (!session) return [];

  const username = "admin";
  const password = "admin";

  try {
    const jsonStr = await new Promise<string>((resolve, reject) => {
      const options = {
        hostname: 'workspace_nextcloud',
        port: 80,
        path: `/ocs/v2.php/apps/activity/api/v2/activity/filter?format=json&object_type=files&object_id=${fileId}`,
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
          'Host': 'localhost',
          'OCS-APIRequest': 'true'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.end();
    });

    const json = JSON.parse(jsonStr);
    return json?.ocs?.data || [];
  } catch(e) {
    console.error("Activity API failed", e);
    return [];
  }
}

export async function createNextcloudShare(path: string) {
  const session = await auth();
  if (!session) throw new Error("Not authenticated");

  const username = "admin";
  const password = "admin";

  const relativePath = decodeURIComponent(path).replace(/^\/remote\.php\/webdav/, '');

  const postData = new URLSearchParams({
    path: relativePath,
    shareType: '3', // public link
    permissions: '1' // read only
  }).toString();

  const jsonStr = await new Promise<string>((resolve, reject) => {
    const options = {
      hostname: 'workspace_nextcloud',
      port: 80,
      path: '/ocs/v2.php/apps/files_sharing/api/v1/shares?format=json',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        'Host': 'localhost',
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  try {
    const json = JSON.parse(jsonStr);
    if (json.ocs?.meta?.status === 'ok' || json.ocs?.meta?.statuscode === 100) {
      const token = json.ocs.data.token;
      return `http://localhost:8081/s/${token}`;
    } else {
      throw new Error(json.ocs?.meta?.message || "Failed to create share link");
    }
  } catch(e) {
    throw new Error("Failed to parse share response: " + jsonStr);
  }
}
