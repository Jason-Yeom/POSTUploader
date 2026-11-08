const http = require('node:http');
const fs = require ('node:fs');
const { Buffer } = require('node:buffer');
const PORT = 3333; // set your port here
const saveFile = 'uploaded.log';
const usedStorageLog = 'size.txt';
const blacklist = 'blacklist.tsv';
const AllocatedStorageSizeInBytes = 5e9; // default 5 GB
const MaximumSizePerFileInBytes = 1e9; //default 1gb

if (!fs.existsSync(saveFile)) {
    fs.writeFileSync(saveFile, "");
}
if (!fs.existsSync(usedStorageLog)) {
    fs.writeFileSync(usedStorageLog, "0");
}
if (!fs.existsSync(blacklist)) {
    fs.writeFileSync(blacklist, "");
}

const server = http.createServer((req, res) => {
    var HumanReadableTime = new Date();
    var TimeStamp = HumanReadableTime.toISOString();
    var ip = req.socket.remoteAddress;

    var catBlacklist = fs.readFileSync(blacklist, 'utf8')
    var a = catBlacklist.split('\n');

    var block = false;
    try {
        a.forEach((element) => {
            if(element.split('\t')[0] == ip) {
                // res.writeHead(403, {'Content-Type':'text/plain'});
                // res.end(`Forbidden\n`);
                console.log(`blocked ${ip} because of blacklist`);
                block = true;
                return;
            }
    });
    } catch (e) {
        console.error(e);
        return;
    }

    if (req.method === 'POST' && !block) {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
            const body = Buffer.concat(chunks).toString();
            var size = Buffer.byteLength(body, 'utf8');
            if(size > MaximumSizePerFileInBytes) {
                res.writeHead(400, {'Content-Type':'text/plain','Access-Control-Allow-Origin': '*'});
                res.end(`file is too large.\n`)
                fs.appendFile(blacklist, `${ip}\t${TimeStamp}\t${size}\n`)
                console.log(`blocked ${ip} trying to upload ${size} bytes of data`);
                block = true;
                return;
            }
            var currentsizestr = fs.readFileSync(usedStorageLog, 'utf8');
            var currentsize = parseInt(currentsizestr) || 0;
            if(currentsize + size >= AllocatedStorageSizeInBytes){
                res.writeHead(507, {'Content-Type': 'text/plain','Access-Control-Allow-Origin': '*'});
                res.end('Save failed - storage limit\n'); 
                block = true;
                return;
            }
            fs.appendFile(saveFile, `${ip} - ${body}\n`, (e) => {
                if (e) { console.error(`save failed: ${e}`);
                    res.writeHead(500, {'Content-Type':'text/plain','Access-Control-Allow-Origin': '*'});
                    res.end('Save failed\n');  // ← the reply that was missing
                    return;
                } else if (!e && !block) {
                    res.writeHead(200, {'Content-Type':'text/plain','Access-Control-Allow-Origin': '*'});
                    res.end('Successfully uploaded.\n'); 
                    var currentsizestr = fs.readFileSync(usedStorageLog, 'utf8');
                    var currentsize = parseInt(currentsizestr) || 0;
                    fs.writeFileSync(usedStorageLog, `${currentsize + size}` ,{encoding:'utf8',flag:'w'});
                    return;
                } else {
                    return;
                }

            });
        });
    } else if (block) {
        res.writeHead(403, {'Content-Type':'text/plain','Access-Control-Allow-Origin': '*'});
        res.end(`Forbidden\n`);
        return;
    } else {
        res.writeHead(405, { 'Content-Type': 'text/plain','Access-Control-Allow-Origin': '*'});
        console.log(`${ip} used ${req.method} to request the server - returned 405`);
        res.end('Expected POST; Method not allowed\n');
        return;
    }
});

server.listen(PORT || 80, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}/`);
})
