const http = require('http');

async function test() {
    const xml = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/drive/preview', // not relevant
        method: 'GET'
      };
      // let's just make a POST request to our own next.js server to run a server action? No, hard to do.
    });
}
