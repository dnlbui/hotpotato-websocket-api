///////////////////////////////////////////////
///////////// IMPORTS + VARIABLES /////////////
///////////////////////////////////////////////

const CONSTANTS = require('./utils/constants.js');
const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// Constants
const { PORT, MAX_TIME, CLIENT, SERVER } = CONSTANTS;

// Application Variables;
let nextPlayerIndex = 0;

///////////////////////////////////////////////
///////////// HTTP SERVER LOGIC ///////////////
///////////////////////////////////////////////

// Create the HTTP server
const server = http.createServer((req, res) => {
  // get the file path from req.url, or '/public/index.html' if req.url is '/'
  const filePath = ( req.url === '/' ) ? '/public/index.html' : req.url;

  // determine the contentType by the file extension
  const extname = path.extname(filePath);
  let contentType = 'text/html';
  if (extname === '.js') contentType = 'text/javascript';
  else if (extname === '.css') contentType = 'text/css';

  // pipe the proper file to the res object
  res.writeHead(200, { 'Content-Type': contentType });
  // fs.createReadStream.pipe(res) is a way to stream the file to the client
  fs.createReadStream(`${__dirname}/${filePath}`, 'utf8').pipe(res);
});

///////////////////////////////////////////////
////////////////// WS LOGIC ///////////////////
///////////////////////////////////////////////

// TODO: Create the WebSocket Server (ws) using the HTTP server
// server is the HTTP server the websocket server will use
const wsServer = new WebSocket.Server({ server }); 

// TODO: Define the websocket server 'connection' handler
// event handler for when a new client connects to the server. 
// prepares it to respond to client connection events then messages
// socket represents the connection between the server and the client 
wsServer.on('connection', (socket) => {
  console.log('A new client has connected to the server!');

  // TODO: Define the socket 'message' handler
  socket.on('message', (data) => {
    console.log(JSON.parse(data));
    //console.log(socket);
    
    // Destructure the type and payload from the parsed JSON string data
    const { type, payload } = JSON.parse(data);
  
    switch (type) {
      // 'NEW_USER' => handleNewUser(socket)
      case CLIENT.MESSAGE.NEW_USER:
        handleNewUser(socket);
        break;
      // 'PASS_POTATO' => passThePotatoTo(newPotatoHolderIndex)
      case CLIENT.MESSAGE.PASS_POTATO:
        passThePotatoTo(payload.newPotatoHolderIndex);
        break;
      default:
        break;
    }
  })
})



///////////////////////////////////////////////
////////////// HELPER FUNCTIONS ///////////////
///////////////////////////////////////////////

// TODO: Implement the broadcast pattern
const broadcast = (data, socketToOmit) => {
  // iterate over the connected clients and send the data to each one
  // wsServer.clients is an array of all the connected clients
  wsServer.clients.forEach((connectedClient) => {
    // Make sure the client is open and not the socket that sent the data
    // .send sends a message to the client that is connected to the socket 
    // serialize the data with JSON.stringify
    // in this case, the socketToOmit is the socket that sent the data but not used in this application
    if (connectedClient.readyState === WebSocket.OPEN && connectedClient !== socketToOmit) {
      // Send the data to the connected client
      connectedClient.send(
        JSON.stringify(data)
      );
    }
  });
}

function handleNewUser(socket) {
  // Until there are 4 players in the game....
  if (nextPlayerIndex < 4) {
    // TODO: Send PLAYER_ASSIGNMENT to the socket with a clientPlayerIndex
    // .send sends a message to the client that is connected to the socket 
    // serialize the data with JSON.stringify
    socket.send(JSON.stringify(
      {
        type: SERVER.MESSAGE.PLAYER_ASSIGNMENT,
        payload: { clientPlayerIndex: nextPlayerIndex }
      }
    ))
    
    // Then, increment the number of players in the game
    nextPlayerIndex++;
    
    // If they are the 4th player, start the game
    if (nextPlayerIndex === 4) {
      // Choose a random potato holder to start
      const randomFirstPotatoHolder = Math.floor(Math.random() * 4);
      passThePotatoTo(randomFirstPotatoHolder);
      
      // Start the timer
      startTimer();
    }
  } 
  
  // If 4 players are already in the game...
  else {
    // TODO: Send GAME_FULL to the socket
    socket.send(JSON.stringify({type: SERVER.MESSAGE.GAME_FULL}))
  }
}


function passThePotatoTo(newPotatoHolderIndex) {
  // TODO: Broadcast a NEW_POTATO_HOLDER message with the newPotatoHolderIndex
  const data = {
    type: SERVER.BROADCAST.NEW_POTATO_HOLDER,
    payload: { newPotatoHolderIndex }
  }
  broadcast(data);
}

function startTimer() {
  // Set the clock to start at MAX_TIME (30)
  let clockValue = MAX_TIME;
  
  // Start the clock ticking
  // setInterval runs a function every x milliseconds
  const interval = setInterval(() => {
    if (clockValue > 0) {
      // decrement until the clockValue reaches 0
      clockValue--;

      // TODO: broadcast 'COUNTDOWN' with the clockValue
      const data =         {
        type: SERVER.BROADCAST.COUNTDOWN, 
        payload: { clockValue }
      }
      broadcast(
        data
      )

    }

    // At 0...
    else {
      // clearInterval stops the interval from running again
      // clearInterval removes the interval from the event loop
      // clearInterval releases the variable interval from memory
      clearInterval(interval); // stop the timer
      nextPlayerIndex = 0; // reset the players index
      
      // TODO: Broadcast 'GAME_OVER'
      broadcast({type: SERVER.BROADCAST.GAME_OVER})
    }
  }, 1000);
}

// Start the server listening on localhost:8080
server.listen(PORT, () => {
  console.log(`Listening on: http://localhost:${server.address().port}`);
});
