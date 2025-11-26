import React, {useEffect, useRef, useImperativeHandle, forwardRef} from "react";
import Matter from "matter-js";

const width = 800;
const height = 800;
const drumRadius = 300;
const knobRadius = 28;

const BingoMachine = forwardRef(function BingoMachine({ballCount, canControl, onRotate, isDebug}, ref) {
    console.log("BingoMachine rendered");
    const sceneRef = useRef(null);
    const engineRef = useRef(null);
    const renderRef = useRef(null);
    const angleRef = useRef(0);
    const draggingRef = useRef(false);
    const rotationCountRef = useRef(0);
    const prevNormAngleRef = useRef(0);
    const hasPassedHalfwayRef = useRef(false);
    const knobRef = useRef(null);
    const drumCenterRef = useRef({ x: width/2, y: height/2 });

    // NEW: store balls so energize can use them
    const ballsRef = useRef([]);

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

        if (forward && !hasPassedHalfwayRef.current) {
            if (prev < HALF_MARKER && curr >= HALF_MARKER) {
                hasPassedHalfwayRef.current = true;
                console.log("halfway passed");
            }
        }
        const crossedLap = forward && hasPassedHalfwayRef.current && prev < LAP_MARKER + LAP_THRESHOLD && curr >= LAP_MARKER;
        if (crossedLap && hasPassedHalfwayRef.current) {
            rotationCountRef.current += 1;
            hasPassedHalfwayRef.current = false;
            console.log("rotation")
            if (onRotate) {
                onRotate({angle: rawAngle, rotations: 1 });
            }

        }
        prevNormAngleRef.current = curr;
    };

    useImperativeHandle(ref, () => ({
        updateAngle: (newAngle, newRotationCount) => {
            angleRef.current = newAngle;
            // rotationCountRef.current = newRotationCount;

            // Energize balls based on the new knob rotation
            // Only if balls exist (they are stored in ballsRef)
            if (ballsRef.current.length > 0) {
                const drumCenter = drumCenterRef.current
                energizeBalls(ballsRef.current, drumCenter, drumRadius, {
                    tangentialStrength: 0.0012,
                    inwardStrength: 0.00002,
                    avoidNearWallPx: 22
                });

                // Limit max speed to prevent tunneling
                const MAX_SPEED = 20;
                ballsRef.current.forEach(ball => {
                    const v = ball.velocity;
                    const speed = Math.sqrt(v.x*v.x + v.y*v.y);
                    if (speed > MAX_SPEED) {
                        const scale = MAX_SPEED / speed;
                        Matter.Body.setVelocity(ball, { x: v.x * scale, y: v.y * scale });
                    }
                });
            }
        }
    }));

    function createHollowCircle(x, y, radius, thickness = 10, segments = 40) {
        const { Bodies } = Matter;

        const angleStep = (Math.PI * 2) / segments;
        const walls = [];

        // We'll make each segment slightly longer than needed to avoid tiny gaps
        const segLength = Math.max(10, Math.round((Math.PI * 2 * radius) / segments) + 6);

        for (let i = 0; i < segments; i++) {
            const angle = i * angleStep;

            const wall = Bodies.rectangle(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
                thickness,
                segLength,
                {
                    isStatic: true,
                    angle: angle + Math.PI / 2,

                    // 👇 ZERO friction so balls don't stick
                    friction: 0,
                    frictionStatic: 0,
                    frictionAir: 0,
                    restitution: 1, // bouncy interior

                    render: {
                        fillStyle: "#fff",
                        strokeStyle: "#fff",
                        lineWidth: 1,
                    }
                }
            );
            walls.push(wall);
        }
        return walls;
    }

    // energizeBalls: tangential push + small inward corrector, safe near wall
    function energizeBalls(balls, drumCenter, drumRadius, options = {}) {
        const { Body } = Matter;
        const {
            tangentialStrength = 0.0008, // base tangential force
            inwardStrength = 0.0003,     // small inward pulling force when near rim
            avoidNearWallPx = 18         // don't push tangentially if this close to rim
        } = options;

        balls.forEach(ball => {
            const dx = ball.position.x - drumCenter.x;
            const dy = ball.position.y - drumCenter.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return;

            // unit radial vector (from center to ball)
            const ux = dx / dist;
            const uy = dy / dist;

            // unit tangential vector (perpendicular, CCW)
            const tx = -uy;
            const ty = ux;

            // If ball is very close to wall, skip tangential push to avoid tunneling
            const distanceToWall = drumRadius - dist;
            if (distanceToWall > avoidNearWallPx) {
                // tangential force proportional to tangentialStrength (optionally scale with distance of knob movement)
                Body.applyForce(ball, ball.position, { x: tx * tangentialStrength, y: ty * tangentialStrength });
            }

            // If ball is too close to the rim, apply a small inward force to keep it inside
            const safeRadius = drumRadius - (ball.circleRadius ?? (ball.bounds.max.x - ball.bounds.min.x)/2) - (/*wallHalf thickness*/ 15);
            if (dist > safeRadius) {
                Body.applyForce(ball, ball.position, {
                    x: -ux * inwardStrength,
                    y: -uy * inwardStrength
                });
            }
        });
    }

    useEffect(() => {
        const {Engine, Render, Runner, World, Bodies, Body, Mouse, MouseConstraint, Events} = Matter;

        const engine = Engine.create();
        const world = engine.world;
        engineRef.current = engine;

        const render = Render.create({
            element: sceneRef.current,
            engine,
            options: {width, height, wireframes: false, background: "#f0f0f0"},
        });
        renderRef.current = render;

        const drumCenter = drumCenterRef.current
        const wallThickness = 80;
        const segments = 75;

        const drumWalls = createHollowCircle(drumCenter.x, drumCenter.y, drumRadius, wallThickness, segments);

        // Knob stays STATIC on rim (like your original)
        knobRef.current = Bodies.circle(drumCenter.x + drumRadius, drumCenter.y, knobRadius, {
            isStatic: true,
            render: {fillStyle: "#ff0000"},
        });

        // Balls (store in ref for energize access)
        ballsRef.current = [...Array(ballCount)].map(() => Bodies.circle(
            drumCenter.x + (Math.random() * 80 - 40),
            drumCenter.y + (Math.random() * 80 - 40),
            15,
            {
                restitution: 0.95,   // more bounce
                friction: 0,         // no wall friction
                frictionStatic: 0,
                frictionAir: 0.005,  // small drag so they slow down smoothly
                density: 0.001,      // makes them lighter and easier to move
                render: {fillStyle: "#3498db"},
            }
        ));

        World.add(world, [...drumWalls, knobRef.current, ...ballsRef.current]);

        const mouse = Mouse.create(render.canvas);
        const mouseConstraint = MouseConstraint.create(engine, {
            mouse,
            constraint: {stiffness: 0.7, render: {visible: false}},
        });

        if (canControl) {
            World.add(world, mouseConstraint);
        }
        const angleFromPos = (pos) => Math.atan2(pos.y - drumCenter.y, pos.x - drumCenter.x);
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
            Events.on(render, "afterRender", () => {
                const ctx = render.context;
                ctx.save();
                ctx.translate(drumCenter.x, drumCenter.y);

                ctx.strokeStyle = "red";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(HALF_MARKER) * drumRadius, Math.sin(HALF_MARKER) * drumRadius);
                ctx.stroke();

                ctx.strokeStyle = "green";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(LAP_MARKER) * drumRadius, Math.sin(LAP_MARKER) * drumRadius);
                ctx.stroke();

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

                // NEW: energize, but with safer params
                energizeBalls(ballsRef.current, drumCenter, drumRadius, {
                    tangentialStrength: 0.0012,  // stronger push around the circle
                    inwardStrength: 0.00005,     // VERY tiny inward nudge
                    avoidNearWallPx: 22          // avoid pushing when too close
                });
                const MAX_SPEED = 20;
                ballsRef.current.forEach(ball => {
                    const v = ball.velocity;
                    const speed = Math.sqrt(v.x*v.x + v.y*v.y);
                    if (speed > MAX_SPEED) {
                        const scale = MAX_SPEED / speed;
                        Matter.Body.setVelocity(ball, { x: v.x * scale, y: v.y * scale });
                    }
                });

                if (onRotate) {
                    onRotate({angle, rotations: 0 });
                }
            }

            // Keep knob glued to rim (static body - reposition to follow angleRef if external updates occur)
            Body.setPosition(knobRef.current, {
                x: drumCenter.x + Math.cos(angleRef.current) * drumRadius,
                y: drumCenter.y + Math.sin(angleRef.current) * drumRadius,
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
    }, [canControl, onRotate, isDebug]);

    return <div ref={sceneRef} style={{width: 800, height: 800}}/>;
});

export default BingoMachine;
