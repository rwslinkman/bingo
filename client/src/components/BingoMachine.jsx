import React, { useEffect, useRef } from "react";
import Matter from "matter-js";

export default function BingoMachine({ trigger }) {
    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);

    useEffect(() => {
        const Engine = Matter.Engine;
        const Render = Matter.Render;
        const World = Matter.World;
        const Bodies = Matter.Bodies;
        const Body = Matter.Body;
        const Constraint = Matter.Constraint;
        const Mouse = Matter.Mouse;
        const MouseConstraint = Matter.MouseConstraint;

        const width = 400;
        const height = 400;

        // create engine
        const engine = Engine.create();
        engineRef.current = engine;

        // create renderer
        const render = Render.create({
            element: sceneRef.current,
            engine: engine,
            options: {
                width,
                height,
                wireframes: false,
                background: "#f0f0f0",
            },
        });
        renderRef.current = render;

        // create circular drum (static)
        const drumRadius = 150;
        const drum = Bodies.circle(width / 2, height / 2, drumRadius, {
            isStatic: true,
            render: {
                fillStyle: "#fff",
                strokeStyle: "#333",
                lineWidth: 4,
            },
        });

        // create a knob for dragging
        const knobRadius = 12;
        const knob = Bodies.circle(width / 2 + drumRadius, height / 2, knobRadius, {
            isStatic: false,
            render: {
                fillStyle: "#ff0000",
            },
        });

        // constrain knob to drum (simulate handle)
        const knobConstraint = Constraint.create({
            bodyA: drum,
            bodyB: knob,
            pointA: { x: drumRadius, y: 0 },
            length: 0,
            stiffness: 0.9,
        });

        // create balls inside drum
        const balls = [];
        for (let i = 0; i < 10; i++) {
            const ball = Bodies.circle(
                width / 2 + Math.random() * 80 - 40,
                height / 2 + Math.random() * 80 - 40,
                15,
                {
                    restitution: 0.8,
                    render: {
                        fillStyle: "#3498db",
                    },
                }
            );
            balls.push(ball);
        }

        World.add(engine.world, [drum, knob, knobConstraint, ...balls]);

        // add mouse control
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false },
            },
        });
        World.add(engine.world, mouseConstraint);

        // rotate drum by dragging knob
        Matter.Events.on(mouseConstraint, "enddrag", (e) => {
            if (e.body === knob) {
                // compute torque or just spin drum
                Body.rotate(drum, Math.random() * 2 - 1); // example random rotation
            }
        });

        // run engine & renderer
        Matter.Runner.run(engine);
        Render.run(render);

        // cleanup on unmount
        return () => {
            Render.stop(render);
            Engine.clear(engine);
            render.canvas.remove();
            render.textures = {};
        };
    }, []);

    return (
        <div
            ref={sceneRef}
            style={{ width: 400, height: 400, border: "1px solid #ccc", margin: "0 auto" }}
        ></div>
    );
}
