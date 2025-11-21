export interface PlayerInfo {
    name: string;
    isLeader: boolean;
}

export interface Submission {
    id: string;
    socketId: string;
    content: string;
    submitter: string;
}

export interface BingoBall {
    content: string;
    submitter: string | null; // is null when system creates balls in default mode
}

export interface RoomState {
    id: string;
    roomName: string;
    gameType: "default" | "cardpicker";
    leader: string | null;
    players: Record<string, PlayerInfo>;
    submissions: Submission[];
    completed: Submission[];
    state: "waiting" | "running" | "finished";
    currentAngle: number;
    totalRotations: number;
}

export interface RoomStatus {
    id: string;
    roomName: string;
    gameType: "default" | "cardpicker";
    leader: string | null;
    players: PlayerInfo[];
    balls: BingoBall[];
    currentAngle: number;
    totalRotations: number;
    state: "waiting" | "running" | "finished";
}

export interface SocketResponse {
    ok: boolean;
    room?: RoomStatus;
    error?: string;
}

export type SocketCallback = (response: SocketResponse) => void;

export interface JoinRoomPayload {
    roomName: string;
    playerName: string;
}

export interface SubmitItemPayload {
    roomId: string;
    content: string;
}

export interface StartGamePayload {
    roomId: string;
}

export interface BingoRotationPayload {
    roomId: string,
    angle: number;
    rotations: number;
}