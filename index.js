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
        setTimeout(function () { clearData(code); }, 1000 * 60 * 60 * 24);
    } else {
        users[code].push(ws);
        sendJoined(code);
    }
    if (choices[code] != undefined) {
        sendChoices(code,ws);
    }

    ws.on("message", function (msg) {
        try {
            msg = JSON.parse(msg);
        } catch (e) {
            console.log("error with msg: ", msg);
            sendError(e.message, ws);
            return;
        }
        if (!msg.type || !msg.value) {
            sendError("Message has to include type and value", ws);
            return;
        }
        switch (msg.type) {
            case "r":
                sendRandom(code);
                break;
            case "c":
                if (!setChoices(code, msg.value)) sendError("choices can't be empty", ws);
                break;
        }
    });
});

function sendAll(code, msg) {
    users[code].forEach(function (user) {
        user.send(JSON.stringify(msg));
    });
}

function sendRandom(code) {
    var msg = { type: "r" };
    msg.value = generateRandom(code);
    sendAll(code, msg);
}

function generateRandom(code) {
    var random = Math.floor(Math.random() * choices[code].choices.length);
    return choices[code].choices[random];
}

function sendError(e, ws) {
    var res = { type: "e", value: e };
    ws.send(JSON.stringify(res));
}

function sendChoices(code, ws) {
    var msg = { type: "c" };
    if (!choices[code] || !choices[code].choices || choices[code].choices.length < 1) {
        sendError("choices are empty", ws);
        return;
    }
    msg.value = choices[code];
    ws.send(JSON.stringify(msg));
}

function sendJoined(code) {
    var msg = { type: "j" };
    msg.value = users[code].length - 1;
    sendAll(code, msg);
}

function setChoices(code, receivedChoices) {
    if (!receivedChoices.choices || receivedChoices.choices.length < 1) {
        return false;
    }
    choices[code] = receivedChoices;
    return true;
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