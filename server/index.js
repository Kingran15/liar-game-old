const WebSocket =  require("ws");
var fs = require("fs");

var words = fs.readFileSync("words.txt").toString();
var wordList = words.split("\n");
var wordCount = wordList.length;

var gameInSession = false;

const wss = new WebSocket.Server({ port: 8082 });

class Clients {
    constructor() {
        this.clientlist = {};
        this.waitlist = {};
        this.saveClient = this.saveClient.bind(this);
        this.saveWaitlist = this.saveWaitlist.bind(this);
    }
    
    saveClient(username, client, isHost = false) {
        this.clientlist[username] = {
            socket: client,
            host: isHost
        };
    }

    saveWaitlist(username, client) {
        this.waitlist[username] = {
            socket: client,
            host: false
        };
    }
}

const clients = new Clients();

wss.on("connection", ws => {
    console.log("New client connected");

    ws.on("message", data => {
        try {
            const message = JSON.parse(data);

            switch(message.type) {
                case "username":
                    addClient(message.username, ws);
                    break;
                case "startGame":
                    startGame();
                    break;
                default:
                    console.log(`Error: Unrecognized message ${message.type}`);
            }
        } catch(e) {
            console.log(`Error occured with message: ${e.message}`);
        }

    });

    ws.on("close", () => {
        removeClient(ws);
    });
});

function removeClient(ws) {
    console.log("Client has disconnected!");

    var keys = Object.keys(clients.clientlist);
    var num = keys.length - 1;

    if(num === 0) {
        gameInSession = false;
    }

    var toDelete;

    keys.forEach(key => {
        var cli = clients.clientlist[key].socket;
        if(cli === ws) {
            toDelete = key;
        }
        else if(!gameInSession){
            sendPlayerCount(cli, num);
        }
    });

    //key = username
    if(toDelete == null) {
        var waiters = Object.keys(clients.waitlist);
        waiters.forEach( key => {
            var clientData = clients.waitlist[key];
            if(clientData.socket === ws ) {
                console.log(`Goodbye ${key}!`);
                delete clients.waitlist[key];
            }
        });
        return;
    }

    let assignNewHost = clients.clientlist[toDelete].host;

    console.log(`Goodbye ${toDelete}!`);
    delete clients.clientlist[toDelete];

    if(assignNewHost) {
        if(num !== 0) {
            let newHost = randomProperty(clients.clientlist);
            newHost.host = true;
            sendHostAssignment(newHost.socket);
        }
    }
}

function addClient(username, client) {
    console.log(`Welcome ${username}!`);
    if(gameInSession) {
        clients.saveWaitlist(username, client);
        client.send(JSON.stringify({
            type: "waitlist"
        }));
        console.log(`User ${username} has been added to the waitlist.`);
        return;
    }

    var keys = Object.keys(clients.clientlist);
    var num = keys.length;

    if(num === 0) {
        clients.saveClient(username, client, true);
        sendHostAssignment(client);
    }
    else {
        clients.saveClient(username, client);
    }

    num += 1;

    keys = Object.keys(clients.clientlist);

    keys.forEach(key => {
        var clientData = clients.clientlist[key];
        sendPlayerCount(clientData.socket, num);
    });
}

function moveFromWaitlist() {
    if(clients.waitlist == null) {
        return;
    }

    var keys = Object.keys(clients.waitlist);

    if(keys.length === 0) {
        return;
    }

    keys.forEach(key => {
        clients.saveClient(key, clients.waitlist[key].socket);
    });

    clients.waitlist = {};
}

function startGame() {
    gameInSession = true;
    moveFromWaitlist();

    var liar = randomKey(clients.clientlist);
    var selectedWord = randomWord();

    console.log(selectedWord);

    for(const[uname, clientData] of Object.entries(clients.clientlist)) {
        if(uname === liar) {
            clientData.socket.send(JSON.stringify({
                type: "word",
                word: "LIAR"
            }));
        }
        else {
            clientData.socket.send(JSON.stringify({
                type: "word",
                word: selectedWord
            }));
        }
    }
}

function randomWord() {
    return wordList[Math.random() * wordCount << 0];
}

function randomProperty(obj) {
    return obj[randomKey(obj)];
}

function randomKey(obj) {
    var keys = Object.keys(obj);
    return keys[keys.length * Math.random() << 0];
}

function sendPlayerCount(socket, num) {
    socket.send(JSON.stringify({
        type: "playerCount",
        numPlayers: num
    }));
}

function sendHostAssignment(socket) {
    socket.send(JSON.stringify({
        type: "assignHost"
    }));
}