# POSTUploader

A tiny Node.js HTTP server that accepts POST requests and stores their bodies to disk.

Built as a learning project, then hardened through real deployment. It runs as a
single process with no dependencies beyond Node.js itself.

## Features

- Accepts any POST request and appends the body to `uploaded.log`
  (one line per request, in the form `ip - body`)
- Replies with proper HTTP status codes:
  - `200` - body saved
  - `400` - body too large (per-request limit)
  - `403` - client IP is blacklisted (checked before any data is read)
  - `405` - method not allowed (anything other than POST)
  - `500` - saving failed (client still gets a response, never a hang)
  - `507` - total storage quota exhausted
- Per-request size limit and total storage quota (configurable constants)
- Automatic blacklisting of clients that exceed the per-request limit
- State files are created automatically on first run if they do not exist

## Files

| File | Purpose |
|---|---|
| `index.js` | the server |
| `uploaded.log` | all accepted POST bodies (runtime state) |
| `size.txt` | running total of bytes stored (runtime state) |
| `blacklist.tsv` | blacklisted IPs (runtime state) |

State files are created by the server on startup. Delete them for a fresh start.

## Usage

Requires Node.js 18 or newer.

```bash
node index.js
```

Set the port by editing `PORT` at the top of `index.js`, or deploy with an
environment variable by changing the line to:

```js
const PORT = process.env.PORT || 9999;
```

Send a request:

```bash
curl -X POST --data 'hello world' http://localhost:9999
```

The body is now in `uploaded.log`.

## Configuration

At the top of `index.js`:

- `PORT` - listening port (default 9999)
- `AllocatedStorageSizeInBytes` - total storage quota (default 5 GB)
- `MaximumSizePerFileInBytes` - per-request limit (default 1 GB); exceeding it
  replies `400`, logs the attempt to `blacklist.tsv`, and blocks the IP for
  future requests

## Design notes

- The server is fully synchronous between requests: every request receives
  exactly one reply, including error paths. A failed save answers `500`
  instead of leaving the client hanging.
- The blacklist is checked before the request body is read, so blacklisted
  clients cannot store any data.
- Runtime state files (`uploaded.log`, `size.txt`, `blacklist.tsv`) should
  not be committed to version control. Only `index.js` and `package.json`
  belong in the repository.

## Deployment sketch

Behind nginx with TLS, the server can stay plain HTTP on loopback while nginx
terminates HTTPS in front of it:

```nginx
server {
    listen 443 ssl;
    server_name your.domain.com;
    ssl_certificate     /etc/letsencrypt/live/your.domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your.domain.com/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:3333;
    }
}
```

## License

MIT
