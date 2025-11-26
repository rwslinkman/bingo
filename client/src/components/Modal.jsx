import React from "react";

export default function Modal({ isOpen, onClose, children }) {
    if (!isOpen) return null; // don't render anything if closed

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                backgroundColor: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
            }}
            onClick={onClose} // clicking overlay closes
        >
            <div
                style={{
                    backgroundColor: "white",
                    padding: "2rem",
                    borderRadius: "8px",
                    minWidth: "300px",
                    maxWidth: "90%",
                }}
                onClick={e => e.stopPropagation()} // prevent closing when clicking inside
            >
                {children}
                <button
                    style={{ marginTop: "1rem" }}
                    onClick={onClose}
                >
                    Close
                </button>
            </div>
        </div>
    );
}
