const { URL } = require('url');
const url = new URL("http://localhost?path=%2Fremote.php%2Fwebdav%2FNextcloud%2520Manual.pdf");
console.log("Original path:", url.searchParams.get("path"));
console.log("encodeURI:", encodeURI(url.searchParams.get("path")));
