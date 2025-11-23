import React from "react";

const PlayersList = ({ players }) => {
    return (
        <section>
            <h3>Players</h3>
            <ul>
                {players.map((p, i) => (
                    <li key={i}>{p.name} {p.isLeader ? " (leader)" : ""}</li>
                ))}
            </ul>
        </section>
    );
};

export default React.memo(PlayersList);