import * as http from "http";

async function test() {
    const xml = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'workspace_nextcloud',
        port: 80,
        path: '/remote.php/webdav/',
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${Buffer.from("admin:admin").toString("base64")}`,
          'Depth': '1',
          'Host': 'localhost'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.end();
    });
    console.log(xml);
}
test();
