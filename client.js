var socket;

function sendUsername() {
    ws = connectToWebSocket();
    ws.addEventListener("open", () => {
        console.log("We are connected!");

        var name = $("#username").val();

        ws.send(JSON.stringify({
            type: "username",
            username: name
        }));
    });

    socket = ws;
}

function connectToWebSocket() {
    const ws = new WebSocket("ws://192.168.0.117:8082");

    ws.addEventListener("message", ({ data }) => { 
        try {
            const message = JSON.parse(data);
            parseMessage(message);
        } catch(e) {
            console.log(`Error occured with message: ${e.message}`);
        }
    });

    return ws;
}

//Parse JSON message from server
function parseMessage(message) {
    switch(message.type) {
        case "playerCount":
            setPlayerCount(message.numPlayers);
            break;
        case "assignHost":
            addHostPrivileges();
            break;
        case "word":
            setWord(message.word);
            break;
        case "waitlist":
            joinWaitlist();
            break;
        default:
            console.log(`Error: Unrecognised message ${message.type}`);
    }
}

function setPlayerCount(num) {
    $("#numPlayers").html(num);
    $("#login").hide();
    $("#lobby").show();
}

function addHostPrivileges() {
    $(".host").show();
}

function joinWaitlist() {
    $("#login").hide();
    $("#waitlist").show();
}

function startGame() {
    socket.send(JSON.stringify({
        type: "startGame"
    }));
}

function setWord(word) {
    $("#lobby").hide();
    $("#waitlist").hide();
    $("#game").show();

    $("#word").html(word);
}