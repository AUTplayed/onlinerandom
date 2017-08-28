var code;
var choices = [];
var result;
var machine;
var strChoices;
var ws;

$(document).ready(function () {
    if(location.pathname == "/") {
        $("#choices-wrapper").show();
    } else {
        $("#random-wrapper").show();
        code = location.pathname.substr(1, location.pathname.length);
        connectWS();
    }

    $("#send-choices").click(function () {
        var inChoices = $("#choices").val();
        inChoices = inChoices.split("\n");
        strChoices = "c:";
        for (var i = 0; i < inChoices.length; i++) {
            strChoices += encodeURIComponent(inChoices[i]);
            if (i < inChoices.length - 1) {
                strChoices += ";";
            }
        }
        $.get("/code", function (res) {
            code = res;
            $("#code").val(location.origin + "/" + code);
            $("#code").show();
            $("#choices-wrapper").hide();
            connectWS();
            $("#random-wrapper").show();
        });
    });

    $("#roll").click(function () {
        ws.send("r:roll");
        $("#roll").prop("disabled", true);
    });
});

function connectWS() {
    ws = new WebSocket("ws://" + location.host + "/ws/" + code);
    ws.onmessage = processCommand;
    ws.onopen = sendChoices;
}

function sendChoices() {
    if(strChoices && strChoices != "") {
        ws.send(strChoices);
        setChoices(strChoices.split(":")[1]);
    }
}

function setJoiners(amount) {
    $("#joiners").html("People watching: " + amount);
}

function processCommand(msg) {
    var command = msg.data.split(":");
    switch (command[0]) {
        case "r":
            $("#roll").prop("disabled", true);
            result = command[1].replace(/</g, "&lt;").replace(/>/g, "&gt;");
            animateResult();
            break;
        case "c":
            setChoices(command[1]);
            break;
        case "j":
            setJoiners(command[1]);
    }
}

function setChoices(command) {
    command = command.split(";");
    processLargeArrayAsync(command, function (choices) {
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
    $("#slotmachine").css("height", height+"ex");
}

function animateResult() {
    $("#slotmachine").css("height", "3ex");
    var index = choices.findIndex(function (e) { return e == result });
    machine.setRandomize(function () {
        return index;
    });
    setTimeout(function() {
        machine.shuffle();
    },1000);
    setTimeout(function () {
        machine.stop();
        $("#roll").prop("disabled", false);
    }, 5000);
}

function processLargeArrayAsync(array, callback, done) {
    maxTimePerChunk = 200;
    var index = 0;

    function now() {
        return new Date().getTime();
    }

    function doChunk() {
        var startTime = now();
        while (index < array.length && (now() - startTime) <= maxTimePerChunk) {
            callback(array[index++]);
        }
        if (index < array.length) {
            // set Timeout for async iteration
            setTimeout(doChunk, 1);
        } else done ? done() : null;
    }
    doChunk();
}
