import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import * as http from "http";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  let path = searchParams.get("path");
  if (!path) return new NextResponse("Missing path", { status: 400 });

  const isDir = searchParams.get("isDir") === "true";
  if (isDir) {
    const webdavPrefix = '/remote.php/webdav';
    const decodedPath = decodeURIComponent(path);
    let folderPath = decodedPath.startsWith(webdavPrefix) ? decodedPath.substring(webdavPrefix.length) : decodedPath;
    if (folderPath.endsWith('/')) folderPath = folderPath.slice(0, -1);
    
    const parts = folderPath.split('/');
    const files = parts.pop() || '';
    let dir = parts.join('/') || '/';
    
    path = `/index.php/apps/files/ajax/download.php?dir=${encodeURIComponent(dir)}&files=${encodeURIComponent(files)}`;
  } else {
    // WebDAV paths are already URL encoded. Do not double encode.
  }

  const username = "admin";
  const password = "admin";

  try {
    const { stream, headers } = await new Promise<{ stream: ReadableStream, headers: Headers }>((resolve, reject) => {
      const options = {
        hostname: 'workspace_nextcloud',
        port: 80,
        path: path,
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
          'Host': 'localhost'
        }
      };

      const req = http.request(options, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new Error(`Status: ${res.statusCode}`));
        }

        const stream = new ReadableStream({
          start(controller) {
            res.on('data', chunk => controller.enqueue(new Uint8Array(chunk)));
            res.on('end', () => controller.close());
            res.on('error', err => controller.error(err));
          }
        });

        const headers = new Headers();
        if (res.headers['content-type']) headers.set('Content-Type', res.headers['content-type'] as string);
        if (res.headers['content-length']) headers.set('Content-Length', res.headers['content-length'] as string);

        headers.set('X-Content-Type-Options', 'nosniff');
        
        resolve({ stream, headers });
      });

      req.on('error', reject);
      req.end();
    });

    return new NextResponse(stream, { headers });
  } catch (error: any) {
    console.error("Preview error:", error);
    return new NextResponse(`Failed to load preview: ${error.message || error}`, { status: 500 });
  }
}
