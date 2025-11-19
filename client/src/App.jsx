// client/src/App.jsx
import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import BingoMachine from "./components/BingoMachine";
import CardReveal from "./components/CardReveal";

// connect to same origin
const socket = io("http://localhost:3000");

function randomPlayerName() {
    return `Player${Math.floor(Math.random() * 900 + 100)}`
}

export default function App() {
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
    const [isLeader, setIsLeader] = useState(false);

    // spin / reveal
    const [lastChosenId, setLastChosenId] = useState(null);
    const [revealedCard, setRevealedCard] = useState(null);

    // set up socket listeners once
    useEffect(() => {
        socket.on("connect", () => {
            // noop for now
            console.log("connected to websocket server");
        });

        socket.on("room_update", (payload) => {
            if (!payload) return;

            console.log(payload);
            setRoomId(payload.id)
            setRoomName(payload.roomName)
            setGameType(payload.gameType)
            setIsLeader(Boolean(payload.leader));
            setPlayers(payload.players || []);
            setSubmissions(payload.balls || []);
            setState(payload.state)

            console.log(submissions);
        });

        socket.on("spin_started", ({ chosenId }) => {
            // server told us which card will be revealed (so clients can sync animation)
            setLastChosenId(chosenId);
            // clear previous reveal so overlay can re-open
            setRevealedCard(null);
        });

        socket.on("reveal_card", ({ card }) => {
            // card: { id, name, content }
            setRevealedCard(card);
        });

        // clean up on unmount
        return () => {
            socket.off("connect");
            socket.off("room_update");
            socket.off("spin_started");
            socket.off("reveal_card");
        };
    }, []);

    // join room and register name
    const joinRoom = () => {
        if (!roomName.trim() || !name.trim()) return;
        console.log(roomName)
        console.log(name)
        socket.emit("join_room", { roomName, playerName: name }, (res) => {
            if (res && res.ok) {
                setJoined(true);
                setRoomId(res.room.id)
                setRoomName(res.room.roomName)
                setGameType(res.room.gameType)
                setIsLeader(Boolean(res.room.leader));
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
        socket.emit("submit_item", { roomId: roomId, content: trimmed }, (res) => {
            if (!res || !res.ok) {
                alert((res && res.error) || "Failed to submit card");
            }
        });
    };

    // leader starts spin — server chooses card and broadcasts
    const startSpin = () => {
        if (!isLeader) return;
        socket.emit("start_spin", { roomId: roomId }, (res) => {
            if (res && !res.ok) {
                alert(res.error || "Failed to start spin");
            }
        });
    };

    const startRound = () => {
        if (!isLeader) return;
        socket.emit("start_game", { roomId: roomId }, (res) => {
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

    const onBingoMachineRotate = ({ currentAngle, degrees, totalRotation }) => {
        console.log(currentAngle, degrees, totalRotation);
        if (degrees >= 360 * 5) {
            console.log("5 full rotations done!");
        }
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
                    <strong>You:</strong> {name} {isLeader ? " (leader)" : ""}
                </div>

                <div style={{ marginBottom: 12 }}>
                    <button onClick={startRound} disabled={!isLeader || submissions.length === 0 || state !== "waiting" } style={{ padding: "8px 12px" }}>
                        {isLeader ? "Start game (leader)" : "Waiting for leader"}
                    </button>
                </div>

                <section style={{ marginBottom: 12 }}>
                    <h3>Players</h3>
                    <ul>
                        {players.map((p, i) => (
                            <li key={i}>{p.name} {p.isLeader ? " (leader)" : ""}</li>
                        ))}
                    </ul>
                </section>

                <section style={{ marginBottom: 12 }}>
                    <h3>Submitted cards</h3>
                    <ul>
                        {submissions.map((s, i) => (
                            <li key={i}>{s.content}</li>
                        ))}
                    </ul>
                </section>

                { state === "waiting" ?
                (<section>
                    <h3>Submit card</h3>
                    <input placeholder="Type a card and press Enter" onKeyDown={onCardKeyDown} style={{ width: "100%", padding: 8 }} />
                    <small style={{ display: "block", marginTop: 6 }}>Cards are revealed by the leader's spin.</small>
                </section>) : "" }

            </aside>

            <main style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BingoMachine
                    canControl={isLeader}
                    onRotate={(state) => {
                        console.log(state)
                        socket.emit("bingo_rotate", state)
                    }
                }/>

                {/*/!* Reveal overlay *!/*/}
                {/*{revealedCard && (*/}
                {/*    <div style={{ position: "absolute", right: 24, top: 24 }}>*/}
                {/*        <CardReveal card={revealedCard} />*/}
                {/*    </div>*/}
                {/*)}*/}
            </main>
        </div>
    );
}
