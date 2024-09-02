const http = require('http');
http.createServer(function (req, res) {
    res.write("Ref McDonald");
    res.end();
}).listen(8080);