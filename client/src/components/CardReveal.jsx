import React from "react";
import { motion } from "framer-motion";

export default function CardReveal({ card, onFinish }) {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full text-center p-6">
            <motion.div
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
            >
                <h1 className="text-3xl font-bold mb-4">{card.name}</h1>
                <p className="text-gray-700 text-lg">{card.description}</p>
            </motion.div>

            <button
                onClick={onFinish}
                className="mt-8 px-6 py-3 bg-indigo-600 text-white rounded-xl shadow hover:bg-indigo-700 transition"
            >
                Back to Game
            </button>
        </div>
    );
}
