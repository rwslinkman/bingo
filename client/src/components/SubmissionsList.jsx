import React from "react";

const SubmissionsList = ({ submissions }) => {
    return (
        <section>
            <h3>Submitted cards</h3>
            <ul>
                {submissions.map((s, i) => (
                    <li key={i}>{s.content}</li>
                ))}
            </ul>
        </section>
    );
};

export default React.memo(SubmissionsList);