import {RoomState, RoomStatus} from "./types";

export function roomStateToStatus(input: RoomState): RoomStatus {
    return {
        id: input.id,
        roomName: input.roomName,
        gameType: input.gameType,
        leader: input.leader,
        players: Object.values(input.players),
        balls: input.submissions.map((s) => {
            return {
                content: s.content,
                submitter: s.submitter,
            };
        }),
        revealedBalls: input.completed.map((s) => {
            return {
                content: s.content,
                submitter: s.submitter,
            };
        }),
        state: input.state,
        currentAngle: input.currentAngle,
        totalRotations: input.totalRotations
    }
}

export function takeRandom(submissions: any[]): any | undefined {
    if (submissions.length === 0) return undefined; // nothing to take

    const randomIndex = Math.floor(Math.random() * submissions.length);
    const [removed] = submissions.splice(randomIndex, 1); // removes the item from the array
    return removed;
}