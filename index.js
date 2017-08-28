//External Dependencies
var express = require('express');
var app = express();
var path = require('path');
var crypto = require("crypto");
var expressWs = require('express-ws')(app);
//Internal Dependencies

//Declarations
var users = [];
var choices = [];

app.use(express.static(__dirname + '/public'));

app.get('/:code', function (req, res) {
    if (req.params.code == "code") {
        res.send(crypto.randomBytes(5).toString('hex'));
    } else {
        res.sendFile(path.join(__dirname + '/public/index.html'));
    }
});

app.ws("/ws/:code", function (ws, req) {
    var code = req.params.code;
    if (users[code] === undefined) {
        users[code] = [];
        setTimeout(function () { clearData(code); }, 1000 * 60 * 60);
    } else {
        users[code].push(ws);
        sendAll(code, "j:" + (users[code].length - 1));
    }

    if (choices[code] != undefined) {
        ws.send(sendChoices(code));
    }

    ws.on("message", function (msg) {
        var command = msg.split(":");
        if (command.length < 2 || command.length > 2) return;
        switch (command[0]) {
            case "r":
                sendAll(code, "r:" + generateRandom(code));
                break;
            case "c":
                setChoices(code, command[1]);
                break;
        }
    });
});

function sendAll(code, msg) {
    users[code].forEach(function (user) {
        user.send(msg);
    });
}

function generateRandom(code) {
    var random = Math.floor(Math.random() * choices[code].length);
    return choices[code][random];
}

function sendChoices(code) {
    var str = "c:";
    if (choices[code]) {
        for (var i = 0; i < choices[code].length; i++) {
            str += choices[code][i];
            if (i < choices[code].length - 1) {
                str += ";";
            }
        }
    }
    return str;
}

function setChoices(code, command) {
    choices[code] = [];
    var receivedChoices = command.split(";");
    receivedChoices.forEach(function (choice) {
        choices[code].push(choice);
    });

}

function clearData(code) {
    delete choices[code];
    if (users[code]) {
        users[code].forEach(function (user) {
            user.terminate();
        });
        delete users[code];
    }
}


app.listen(process.env.PORT || 6003);