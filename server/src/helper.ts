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
                submitter: s.submitter
            };
        }),
        state: input.state,
        currentAngle: input.currentAngle,
        totalRotations: input.totalRotations
    }
}