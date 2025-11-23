import React, {useEffect, useRef, useImperativeHandle, forwardRef} from "react";
import Matter from "matter-js";

const BingoMachine = forwardRef(function BingoMachine({canControl, onRotate, isDebug}, ref) {
    console.log("BingoMachine rendered"); // inside the component body
    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const angleRef = useRef(0);
    const draggingRef = useRef(false);
    const rotationCountRef = useRef(0);
    const prevNormAngleRef = useRef(0);
    const hasPassedHalfwayRef = useRef(false);
    /** @type {React.MutableRefObject<Matter.Body | null>} */
    const knobRef = useRef(null);

    const LAP_MARKER = 0; // radians
    const HALF_MARKER = Math.PI; // 180°
    const LAP_THRESHOLD = 0.05; // tolerance

    const normalize = (a) => {
        let x = a % (Math.PI * 2);
        return x < 0 ? x + Math.PI * 2 : x;
    };

    const checkRotation = (rawAngle) => {
        const prev = prevNormAngleRef.current;
        const curr = normalize(rawAngle); // Delta with wraparound
        let delta = curr - prev;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        const forward = delta > 0;

        // Halfway check: only count if actually passing π radians in forward motion
        if (forward && !hasPassedHalfwayRef.current) {
            if (prev < HALF_MARKER && curr >= HALF_MARKER) {
                hasPassedHalfwayRef.current = true;
                console.log("halfway passed");
            }
        }
        // Lap detection
        const crossedLap = forward && hasPassedHalfwayRef.current && prev < LAP_MARKER + LAP_THRESHOLD && curr >= LAP_MARKER;
        if (crossedLap && hasPassedHalfwayRef.current) {
            rotationCountRef.current += 1;
            hasPassedHalfwayRef.current = false;
            console.log("rotation")
            if (onRotate) {
                onRotate({angle: rawAngle, rotations: rotationCountRef.current,});
            }
        }
        prevNormAngleRef.current = curr;
    };
    useImperativeHandle(ref, () => ({
        updateAngle: (newAngle) => {
            angleRef.current = newAngle;
        }
    }));
    useEffect(() => {
        const {Engine, Render, Runner, World, Bodies, Body, Mouse, MouseConstraint, Events} = Matter;
        const width = 800;
        const height = 800;
        const drumRadius = 300;
        const knobRadius = 28;

        const engine = Engine.create();
        const world = engine.world;
        engineRef.current = engine;

        const render = Render.create({
            element: sceneRef.current,
            engine,
            options: {width, height, wireframes: false, background: "#f0f0f0"},
        });
        renderRef.current = render;

        const drum = Bodies.circle(width / 2, height / 2, drumRadius, {
            isStatic: true,
            render: {fillStyle: "#fff", strokeStyle: "#000", lineWidth: 4},
        });

        // Knob
        knobRef.current = Bodies.circle(drum.position.x + drumRadius, drum.position.y, knobRadius, {
            isStatic: true,
            render: {fillStyle: "#ff0000"},
        });

        // Balls
        const balls = [...Array(10)].map(() => Bodies.circle(width / 2 + Math.random() * 80 - 40, height / 2 + Math.random() * 80 - 40, 15, {
            restitution: 0.8,
            render: {fillStyle: "#3498db"}
        }));

        World.add(world, [drum, knobRef.current, ...balls]);
        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse,
            constraint: {stiffness: 0.7, render: {visible: false}},
        });

        if (canControl) {
            World.add(world, mouseConstraint);
        }
        const angleFromPos = (pos) => Math.atan2(pos.y - drum.position.y, pos.x - drum.position.x);
        let lastAngle = 0;
        if (canControl) {
            Events.on(mouseConstraint, "startdrag", (e) => {
                if (e.body === knobRef.current) {
                    draggingRef.current = true;
                    lastAngle = angleFromPos(mouse.position);
                }
            });
            Events.on(mouseConstraint, "enddrag", (e) => {
                if (e.body === knobRef.current) draggingRef.current = false;
            });
        }
        if (isDebug) {
            // Draw visual helpers after render
            Events.on(render, "afterRender", () => {
                const ctx = render.context;
                ctx.save();
                ctx.translate(drum.position.x, drum.position.y);

                // Halfway line (red)
                ctx.strokeStyle = "red";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(HALF_MARKER) * drumRadius, Math.sin(HALF_MARKER) * drumRadius);
                ctx.stroke();

                // Lap marker line (green)
                ctx.strokeStyle = "green";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(LAP_MARKER) * drumRadius, Math.sin(LAP_MARKER) * drumRadius);
                ctx.stroke();

                // Rotation progress arc
                ctx.strokeStyle = "rgba(0,0,0,0.2)";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, drumRadius - 10, 0, normalize(angleRef.current));
                ctx.stroke();
                ctx.restore();
            });
        }
        Events.on(engine, "beforeUpdate", () => {
            let angle = angleRef.current;
            if (canControl && draggingRef.current) {
                const newAngle = angleFromPos(mouse.position);
                let delta = newAngle - lastAngle;
                if (delta > Math.PI) delta -= 2 * Math.PI;
                if (delta < -Math.PI) delta += 2 * Math.PI;
                angle += delta;
                angleRef.current = angle;
                lastAngle = newAngle;
                checkRotation(angle);
                if (onRotate) {
                    onRotate({angle, rotations: rotationCountRef.current});
                }
            }

            // Update knob position
            Body.setPosition(knobRef.current, {
                x: drum.position.x + Math.cos(angleRef.current) * drumRadius,
                y: drum.position.y + Math.sin(angleRef.current) * drumRadius,
            });
        });

        Runner.run(engine);
        Render.run(render);
        return () => {
            Render.stop(render);
            Engine.clear(engine);
            render.canvas.remove();
            render.textures = {};
        };
    }, [canControl, onRotate]);

    return <div ref={sceneRef} style={{width: 800, height: 800}}/>;
});

export default BingoMachine;