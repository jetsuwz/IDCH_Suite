const http = require("http");

const xml = `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
    <d:prop>
        <d:displayname />
        <cal:calendar-description />
    </d:prop>
</d:propfind>`;

const req = http.request({
    hostname: 'workspace_nextcloud',
    port: 80,
    path: '/remote.php/dav/calendars/admin/',
    method: 'PROPFIND',
    headers: {
        'Authorization': `Basic ${Buffer.from('admin:admin').toString('base64')}`,
        'Depth': '1',
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(xml)
    }
}, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => console.log(data));
});
req.write(xml);
req.end();
