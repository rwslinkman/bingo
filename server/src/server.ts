import express, { Request, Response } from "express";
import http from "node:http";
import { Server, Socket } from "socket.io";
import path from "node:path";
import {
    SocketCallback, JoinRoomPayload, RoomState, Submission, SubmitItemPayload, StartGamePayload,
    BingoRotationPayload
} from "./types";
import { v6 as uuidv6 } from 'uuid';
import {roomStateToStatus, takeRandom} from "./helper";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

const ROTATIONS_NEEDED = 5;
const rooms = new Map<string, RoomState>();

function createRoom(name: string, leaderSocketId: string | null) {
    let roomId = uuidv6()
    const room: RoomState = {
        id: roomId,
        roomName: name,
        gameType: "cardpicker",
        leader: leaderSocketId,
        players: {},
        submissions: [],
        completed: [],
        currentAngle: 0,
        totalRotations: 0,
        state: "waiting"
    };
    rooms.set(roomId, room);
}

function ensureRoomByName(roomName: string): RoomState {
    for (const [_, room] of rooms.entries()) {
        if (room.roomName === roomName) {
            return room;
        }
    }
    // Create new room if none found, then look it up again
    createRoom(roomName, null);
    return ensureRoomByName(roomName)
}

function ensureRoom(id: string): RoomState {
    if (!rooms.has(id)) createRoom(id, null);
    return rooms.get(id)!;
}

io.on("connection", (socket: Socket) => {
    console.log("conn", socket.id);

    socket.on("join_room", (payload: JoinRoomPayload, cb?: SocketCallback) => {
        const { roomName, playerName } = payload;
        const room = ensureRoomByName(roomName);
        socket.join(room.id);

        if (!room.leader) room.leader = socket.id;
        room.players[socket.id] = { name: playerName, isLeader: room.leader == socket.id };

        const roomData = roomStateToStatus(room)
        io.to(room.id).emit("room_update", roomData);
        cb?.({ ok: true, room: roomData });
    });

    socket.on("submit_item", (payload: SubmitItemPayload, cb?: SocketCallback) => {
        const room = ensureRoom(payload.roomId);

        if(room.state != "waiting") {
            return cb?.({ ok: false, error: "game not in waiting state" });
        }

        const entry: Submission = {
            id: uuidv6(),
            socketId: socket.id,
            content: payload.content,
            submitter: room.players[socket.id]?.name ?? "Anon",
            type: "unknown"
        };
        room.submissions.push(entry);

        const roomData = roomStateToStatus(room)
        io.to(room.id).emit("room_update", roomData);
        cb?.({ ok: true, room: roomData });
    });

    socket.on("start_game", (payload: StartGamePayload, cb?: SocketCallback)=> {
        const room = ensureRoom(payload.roomId);

        if(room.state != "waiting") {
            return cb?.({ ok: false, error: "game not in waiting state" });
        }
        if (room.leader !== socket.id) {
            return cb?.({ ok: false, error: "not leader" });
        }
        if (room.submissions.length === 0) {
            return cb?.({ok: false, error: "no balls submitted"});
        }

        room.state = "running"
        room.completed = [];

        const roomData = roomStateToStatus(room)
        io.to(room.id).emit("room_update", roomData);
        cb?.({ ok: true, room: roomData });
    });

    socket.on("bingo_rotate", (payload: BingoRotationPayload, cb?: SocketCallback)=> {
        const room = ensureRoom(payload.roomId);

        if(room.state != "running") {
            return cb?.({ ok: false, error: "game not in running state" });
        }
        if (room.leader !== socket.id) {
            return cb?.({ ok: false, error: "not leader" });
        }

        room.currentAngle = payload.angle;
        room.totalRotations = payload.rotations;

        if(room.totalRotations >= ROTATIONS_NEEDED) {
            // Take ball and reveal content
            room.totalRotations = 0;
            const ballPicked = takeRandom(room.submissions);
            console.log(ballPicked);
            console.log(room.submissions.length);
            room.completed.push(ballPicked);
            console.log(room.completed.length);

            // TODO: game ends when room.submissions is empty

            // const eventData = {
            //     type: ballPicked.type,
            //
            // }
            //  TODO: Emit ballPicked data to all clients to show modal
        }

        const rotationBroadcast = {
            currentAngle: room.currentAngle,
            totalRotations: room.totalRotations
        }
        io.to(room.id).emit("bingo_rotation", rotationBroadcast);
        const roomData = roomStateToStatus(room);

        cb?.({ ok: true, room: roomData });
    });

    socket.on("disconnecting", () => {
        for (const roomId of socket.rooms) {
            if (roomId === socket.id) continue;

            const room = rooms.get(roomId);
            if (!room) continue;

            delete room.players[socket.id];

            if (room.leader === socket.id) {
                room.leader = Object.keys(room.players)[0] ?? null;
            }

            const roomData = roomStateToStatus(room)
            io.to(room.id).emit("room_update", roomData);
        }
    });
});

// ---------------- EXPRESS STATIC FILES ----------------
app.use(express.static(path.join(__dirname, "..", "client", "dist")));

app.get("/", (_: Request, res: Response) => {
    res.sendFile(path.join(__dirname, "..", "client", "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server listening on", PORT);
});
