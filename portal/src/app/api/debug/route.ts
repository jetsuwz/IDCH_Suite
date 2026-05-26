import { NextResponse } from 'next/server';
import * as http from "http";

export async function GET(req: Request) {
  const jsonStr = await new Promise<string>((resolve, reject) => {
    const options = {
      hostname: 'workspace_nextcloud',
      port: 80,
      path: '/index.php/apps/files/ajax/download.php?dir=/&files=awawsw',
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from('admin:admin').toString('base64')}`,
        'Host': 'localhost'
      }
    };

    const r = http.request(options, (res) => {
      resolve(`Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']}`);
    });
    r.end();
  });

  return new NextResponse(jsonStr);
}
