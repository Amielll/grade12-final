# Deferral.IO
This is 2D top-down battle royale in the browser, made for the ICS4U culminating assignment. This software uses Javascript along with other libraries, such as p5.js for graphics and node.js for the server.


## What's in the game?
The game has the following features:
- Players can walk around a map with a camera relative to themselves
- Players can fire weapons
- Item and Inventory system
- Chat system
- Storm that closes in, as the game proceeds
- Supports upto 20 players
- Open-source code, can be easily modified to add new guns, items, etc.
- Full socket support


## Getting Started

These instructions will help getting the software up and running properly on your local machine.

### Prerequisites
The server utilizes node.js. You can install node.js at https://nodejs.org/en/
You will also need to install the socket.io and express dependencies:
```
C:\YourDirectory> npm install socket.io --save
C:\YourDirectory> npm install express --save
```

The User must change the ip in the source code of the game:
1. Open main.js in the public folder
2. Look for line 12 :
```
let socket = io.connect('http://192.168.2.12:8080') // Server IP
```
3. Change the IP to your local IP.
4. If you do not know your local IP, follow the steps in the <b>Testing</b> section.


For Testing purposes, one may change the minimum number of players required to start a game, by accessing the playerQuantity variable in server.js :

```
let playerQuantity = 10;
```

### Testing
By default, the server is set to listen on port 8080. Run the index.js file:
```
C:\> node "C:\YourDirectory\index.js"
```
See if it's working by entering localhost:8080 in the browser's URL field. As of now, you will need to go into the main.js file and change line 3's IP address to your local machine's. You can find your IP by typing:

```
C:\> ipconfig
```

Use the resulting IPv4 address as the new socket connection. Other players will use this address to connect to the game.

## Inspiration
Inspired by <http://www.surviv.io>. During development, the team faced rejection from UWaterloo CS and have therefore incorporated Waterloo memes into the game.

## How To Play The Game

Refer to the 'Help menu' to learn how to play the game.

## Creators

Amiel Nurja and Salik Chodhary
