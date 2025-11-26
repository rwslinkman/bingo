import React from "react";

const SubmissionsList = ({ submissions, completed }) => {
    return (
        <section>
            <h3>Submitted cards</h3>
            <ul>
                {submissions.map((s, i) => (
                    <li key={`active-${i}`}>{s.content}</li>
                ))}

                {completed.map((s, i) => (
                    <li key={`completed-${i}`} style={{ textDecoration: "line-through", opacity: 0.6 }}>
                        {s.content}
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default React.memo(SubmissionsList);
