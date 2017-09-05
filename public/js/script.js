var code;
var choices = [];
var title;
var result;
var machine;
var ws;

$(document).ready(function () {
    if (location.pathname == "/") {
        $("#choices-wrapper").show();
    } else {
        $("#random-wrapper").show();
        code = location.pathname.substr(1, location.pathname.length);
        connectWS();
    }

    $("#send-choices").click(function () {
        title = encodeURIComponent($("#input-title").val());
        choices = $("#choices").val();
        choices = choices.split("\n");
        for (var i = 0; i < choices.length; i++) {
            choices[i] = encodeURIComponent(choices[i]);
        }
        $.get("/code", function (res) {
            code = res;
            connectWS(sendChoices);
        });
    });

    $("#roll").click(function () {
        sendRoll();
        $("#roll").prop("disabled", true);
    });
});

function connectWS(onopen) {
    ws = new WebSocket("wss://" + location.host + "/ws/" + code);
    ws.onmessage = processCommand;
    if (onopen) ws.onopen = onopen;
}

function sendRoll() {
    var msg = { type: "r" };
    msg.value = "roll";
    ws.send(JSON.stringify(msg));
}

function sendChoices() {
    var msg = { type: "c" };
    msg.value = { title: title, choices: choices };
    ws.send(JSON.stringify(msg));
    location.pathname = code;
}

function setJoiners(amount) {
    $("#joiners").html("People watching: " + amount);
}

function processCommand(msg) {
    msg = JSON.parse(msg.data);
    switch (msg.type) {
        case "r":
            $("#roll").prop("disabled", true);
            result = msg.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            animateResult();
            break;
        case "c":
            setChoices(msg.value);
            break;
        case "j":
            setJoiners(msg.value);
            break;
        case "e":
            console.error(msg.value);
    }
}

function setChoices(value) {
    var title = decodeURIComponent(value.title);
    $("#title").html(title.replace(/</g, "&lt;").replace(/>/g, "&gt;"));
    $("head").append("<title>" + title + "</title>")
    processLargeArrayAsync(value.choices, function (choice) {
        choice = decodeURIComponent(choice);
        choice = choice.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        choices.push(choice);
        $("#slotmachine").append("<div>" + choice + "</div>");
    });
    initSlotmachine();
}

function initSlotmachine() {
    var params = {
        delay: choices.length * 200,
        direction: "down"
    };
    machine = $("#slotmachine").slotMachine(params);
    var height = 2.9 * choices.length;
    $("#slotmachine").css("height", height + "ex");
}

function animateResult() {
    $("#slotmachine").css("height", "3ex");
    var index = choices.findIndex(function (e) { return e == result });
    machine.setRandomize(function () {
        return index;
    });
    setTimeout(function () {
        machine.shuffle();
    }, 1000);
    setTimeout(function () {
        machine.stop();
        $("#roll").prop("disabled", false);
    }, 5000);
}

function processLargeArrayAsync(array, callback, done) {
    maxTimePerChunk = 200;
    var index = 0;

    function doChunk() {
        var startTime = Date.now();
        while (index < array.length && (Date.now() - startTime) <= maxTimePerChunk) {
            callback(array[index++]);
        }
        if (index < array.length) {
            // set Timeout for async iteration
            setTimeout(doChunk, 1);
        } else done ? done() : null;
    }
    doChunk();
}
