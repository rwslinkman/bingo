# Bingo

This document contains a complete, ready-to-run project scaffold for a **single-container** app that serves a React frontend (with Matter.js wheel) and a Node.js + Socket.IO backend (in-memory session data). It also contains a GitHub Actions workflow to build and publish the Docker image.

> **Design choices**
>
> * Single Node process (Express) that serves the built React app (`client/dist`) and runs the Socket.IO websocket server.
> * Client uses Matter.js to simulate a drum. The leader can drag to spin — the client plays the spin animation, but the backend is authoritative about which card is revealed. That keeps the animations local/smooth while ensuring everyone sees the same card.
> * Session/room state lives in memory on the server (as requested). Not meant for production scaling — for scale use Redis or a DB.

---

## Project file tree

````
/dutch-bingo
├── .github/
│   └── workflows/ci.yml
├── client/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── BingoMachine.jsx
│       │   └── CardReveal.jsx
│       └── styles.css
├── server/
│   ├── index.js
│   └── package.json
├── Dockerfile
├── .dockerignore
└── README

# Dutch Bingo Monorepo

A single‑container multiplayer Dutch Bingo game. The leader spins a physics‑based Matter.js bingo drum (drag with mouse), which pops out a random card submitted by the players. All state is held in memory and synchronized via WebSockets.

This repo contains:
- **client/** – React app (Matter.js drum, animations, card reveal)
- **server/** – Node.js (Socket.IO server + in‑memory sessions)
- **Dockerfile** – builds the entire project into a single production image
- **.github/** – GitHub Actions workflow for building the Docker image

---

## 🚀 Local Development

### **Requirements**
- Node **24+**
- Yarn or npm

---

## 📦 Install dependencies

From project root:
```bash
cd client && npm install
cd ../server && npm install
````

Or if you use Yarn:

```bash
cd client && yarn
cd ../server && yarn
```

---

## 🧪 Run the full stack (dev mode)

### **1. Start the backend**

```bash
cd server
npm run dev
```

This starts the Socket.IO server on **[http://localhost:3001](http://localhost:3001)**.

### **2. Start the frontend**

```bash
cd client
npm start
```

The React dev server runs on **[http://localhost:3000](http://localhost:3000)** and proxies `/socket.io` to the backend.

---

## 🐳 Run in Docker (production image)

Build and run the single container:

```bash
docker build -t dutch-bingo:latest .
docker run --rm -p 3000:3000 dutch-bingo:latest
```

Open:

```
http://localhost:3000
```

Everything runs inside the container: frontend, backend, and in‑memory room/session state.

---

## 🔌 WebSocket Events

The server exposes the following:

* `join_room`
* `submit_card`
* `start_spin`
* `room_update`
* `spin_started`
* `reveal_card`

The client already listens for these in `App.jsx`.

---

## 🛠 GitHub Actions

The workflow:

* Installs Node 24
* Builds client and server
* Builds the Docker image

Located in:

```
.github/workflows/docker.yml
```

---

## 🧱 Project Structure

```
client/
  src/
    components/
    App.jsx
server/
  index.js
Dockerfile
.github/workflows/docker.yml
README.md
```

---

## 📝 Notes

* State lives in memory → restarting the container resets rooms & cards.
* For production, you may later add Redis for shared state.

---

## ✔ Ready to Extend

Next steps you may want:

* Better drum physics or server‑authoritative randomness
* Animations (Framer Motion) for card reveal
* Persistent room history
* Multiple lobbies
