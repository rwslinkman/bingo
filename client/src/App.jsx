// client/src/App.jsx
import React, {useEffect, useRef, useState} from "react";
import { io } from "socket.io-client";
import BingoMachine from "./components/BingoMachine";
import CardReveal from "./components/CardReveal";
import {throttle} from "lodash/function";
import PlayersList from "./components/PlayersList";
import SubmissionsList from "./components/SubmissionsList";
import Modal from "./components/Modal";

// connect to same origin
const socket = io("http://localhost:3000");

function randomPlayerName() {
    return `Player${Math.floor(Math.random() * 900 + 100)}`
}

export default function App() {
    const bingoRef = useRef(null);
    const MemoBingoMachine = React.memo(BingoMachine);
    // join / identity
    const [roomId, setRoomId] = useState("");
    const [roomName, setRoomName] = useState("room-1");
    const [name, setName] = useState(() => randomPlayerName());
    const [joined, setJoined] = useState(false);

    // room state
    const [state, setState] = useState("waiting")
    const [gameType, setGameType] = useState("cardpicker")
    const [players, setPlayers] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const isLeaderRef = useRef(false);
    // modal
    const [modalContent, setModalContent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // set up socket listeners once
    useEffect(() => {
        socket.on("connect", () => {
            // noop for now
            console.log("connected to websocket server");
        });

        socket.on("room_update", (payload) => {
            if (!payload) return;

            setRoomId(payload.id);
            setRoomName(payload.roomName);
            setGameType(payload.gameType);
            isLeaderRef.current = socket.id === payload.leader;
            setPlayers(payload.players || []);
            setSubmissions(payload.balls || []);
            setState(payload.state)
        });

        socket.on("bingo_rotation", (payload) => {
            if(!payload || isLeaderRef.current) {
                return;
            }
            bingoRef.current.updateAngle(payload.currentAngle, payload.totalRotations);
        });

        socket.on("item_reveal", (payload) => {
            if (!payload) return;

            console.log(payload);
            // data can be anything: string, object, JSX
            setModalContent(
                <div>
                    <h2>🎉 An item was drawn from the Bingo machine!</h2>
                    <p>{payload.content}</p>
                    <p style={{ fontSize: "12pt" }}>Submitted by: {payload.submitter}</p>
                </div>
            );
            setIsModalOpen(true);
        });

        // clean up on unmount
        return () => {
            socket.off("connect");
            socket.off("room_update");
            socket.off("bingo_rotation");
        };
    }, []);

    // join room and register name
    const joinRoom = () => {
        if (!roomName.trim() || !name.trim()) return;
        const payload = { roomName, playerName: name };
        socket.emit("join_room", payload, (res) => {
            if (res && res.ok) {
                setJoined(true);
                setRoomId(res.room.id)
                setRoomName(res.room.roomName)
                setGameType(res.room.gameType)
                isLeaderRef.current = socket.id === res.room.leader
                setPlayers(res.room.players || []);
                setSubmissions(res.room.balls || []);
                setState(res.room.state)
            } else {
                alert((res && res.error) || "Failed to join room");
            }
        });
    };

    // submit a card (text)
    const submitCard = (content) => {
        const trimmed = (content || "").trim();
        if (!trimmed) return;
        const payload = {roomId: roomId, content: trimmed};
        socket.emit("submit_item", payload, (res) => {
            if (!res || !res.ok) {
                alert((res && res.error) || "Failed to submit card");
            }
        });
    };

    const startRound = () => {
        if (!isLeaderRef.current) return;
        const payload = { roomId: roomId };
        socket.emit("start_game", payload, (res) => {
            if (res && !res.ok) {
                alert(res.error || "Failed to start game");
            }
        })
    }

    // simple submit handler for Enter key in input
    const onCardKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            submitCard(e.target.value);
            e.target.value = "";
        }
    };

    const onBingoMachineRotate = (state) => {
        const payload = { roomId: roomId, angle: state.angle, rotations: state.rotations }
        socket.emit("bingo_rotate", payload);
    };

    if (!joined) {
        // Join screen
        return (
            <div style={{ padding: 20, maxWidth: 720, margin: "0 auto" }}>
                <h1> Bingo — Join Room </h1>
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                    <label>
                        Room ID
                        <input value={roomName} onChange={(e) => setRoomName(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 4 }} />
                    </label>
                    <label>
                        Name
                        <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 4 }} />
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={joinRoom} style={{ padding: "8px 12px" }}>Join Room</button>
                    </div>
                    <small>Note: first joiner becomes leader.</small>
                </div>
            </div>
        );
    }

    // Main game UI
    return (
        <div style={{ padding: 16, display: "flex", gap: 16, height: "100vh", boxSizing: "border-box" }}>
            <aside style={{ width: 320, borderRight: "1px solid #eee", paddingRight: 12 }}>
                <h2>Room: {roomName}</h2>
                <div style={{ marginBottom: 12 }}>
                    <strong>RoomID:</strong> {roomId} <br/>
                    <strong>Type:</strong> {gameType} <br/>
                    <strong>State:</strong> {state} <br/>
                    <strong>You:</strong> {name} {isLeaderRef.current ? " (leader)" : ""}
                </div>

                <div style={{ marginBottom: 12 }}>
                    <button onClick={startRound} disabled={!isLeaderRef.current || submissions.length === 0 || state !== "waiting" } style={{ padding: "8px 12px" }}>
                        {isLeaderRef.current ? "Start game (leader)" : "Waiting for leader"}
                    </button>
                </div>

                <PlayersList
                    players={players}
                />
                <SubmissionsList
                    submissions={submissions}
                />

                { state === "waiting" ?
                (<section>
                    <h3>Submit card</h3>
                    <input placeholder="Type a card and press Enter" onKeyDown={onCardKeyDown} style={{ width: "100%", padding: 8 }} />
                    <small style={{ display: "block", marginTop: 6 }}>Cards are revealed by the leader's spin.</small>
                </section>) : "" }

            </aside>

            <main style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MemoBingoMachine
                    ref={bingoRef}
                    canControl={isLeaderRef.current && state === "running"}
                    ballCount={submissions.length}
                    isDebug={false}
                    onRotate={onBingoMachineRotate}
                />

                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                >
                    {modalContent}
                </Modal>
            </main>
        </div>
    );
}
