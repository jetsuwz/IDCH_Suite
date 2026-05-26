const http = require('http');
const req = http.request({
  hostname: 'workspace_nextcloud',
  port: 80,
  path: '/remote.php/webdav/awawsw?downloadStartSecret=123',
  headers: {
    'Authorization': `Basic ${Buffer.from('admin:admin').toString('base64')}`,
    'Host': 'localhost'
  }
}, res => {
  console.log("Status:", res.statusCode);
  console.log("Headers:", res.headers);
});
req.end();
