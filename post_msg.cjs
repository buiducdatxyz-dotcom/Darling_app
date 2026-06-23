const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('POST Response:', data));
});
req.write(JSON.stringify({ match_id: 1, sender_id: 1, content: 'Hello this is test' }));
req.end();
