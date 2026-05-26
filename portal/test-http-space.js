const http = require('http');
try {
  http.request({ path: '/index.php?file=my file' });
  console.log("No error");
} catch (e) {
  console.log("Error:", e.message);
}
