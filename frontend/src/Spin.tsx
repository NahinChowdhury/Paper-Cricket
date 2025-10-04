import React, { useRef, useEffect, useState } from "react";

interface Slice {
	label: string;
	color: string;
}

const slices: Slice[] = [
	{ label: "0", color: "#f94144" },
	{ label: "1", color: "#f3722c" },
	{ label: "2", color: "#f9c74f" },
	{ label: "4", color: "#90be6d" },
	{ label: "6", color: "#43aa8b" },
	{ label: "W", color: "#577590" },
];

const SpinPie: React.FC = () => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [rotation, setRotation] = useState<number>(0); // radians
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [startAngle, setStartAngle] = useState<number>(0);
	const [message, setMessage] = useState<string>("");
	const [inputDeg, setInputDeg] = useState<string>("");

	const SPINNER_RADIUS = 150; // Static radius for the spinner

	const drawPie = (
		ctx: CanvasRenderingContext2D,
		centerX: number,
		centerY: number,
		radius: number,
		rotationAngle: number
	) => {
		const sliceAngle = (2 * Math.PI) / slices.length;

		slices.forEach((slice, i) => {
		const start = i * sliceAngle + rotationAngle;
		const end = start + sliceAngle;

		ctx.beginPath();
		ctx.moveTo(centerX, centerY);
		ctx.arc(centerX, centerY, radius, start, end);
		ctx.closePath();
		ctx.fillStyle = slice.color;
		ctx.fill();

		// Label
		ctx.save();
		ctx.translate(centerX, centerY);
		ctx.rotate(start + sliceAngle / 2);
		ctx.textAlign = "right";
		ctx.fillStyle = "white";
		ctx.font = "16px sans-serif";
		ctx.fillText(slice.label, radius - 10, 5);
		ctx.restore();
		});
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawPie(ctx, canvas.width / 2, canvas.height / 2, SPINNER_RADIUS, rotation);
	}, [rotation]);

	const getAngle = (x: number, y: number, rect: DOMRect) => {
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		return Math.atan2(y - centerY, x - centerX);
	};


	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const rect = canvasRef.current!.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const dx = e.clientX - centerX;
		const dy = e.clientY - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > SPINNER_RADIUS) {
			// Click started outside the pie, ignore drag
			return;
		}

		setIsDragging(true);
		setStartAngle(Math.atan2(dy, dx) - rotation);
	};

	const handleMouseMoveCursor = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const dx = e.clientX - centerX;
		const dy = e.clientY - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance <= SPINNER_RADIUS) {
			canvas.style.cursor = isDragging ? "grabbing" : "grab";
		} else {
			canvas.style.cursor = "default";
		}

		if (isDragging) {
			// Continue rotation while dragging
			const angle = Math.atan2(dy, dx);
			setRotation(angle - startAngle);
		}
	};

	const handleMouseUp = () => setIsDragging(false);

	const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const rect = canvasRef.current!.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const radius = SPINNER_RADIUS; // same as your pie radius

		const dx = e.clientX - centerX;
		const dy = e.clientY - centerY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance > radius) {
			// Click is outside the pie
			setMessage("Clicked outside the pie");
			return;
		}

		const angle = Math.atan2(dy, dx) - rotation;
		const normalized = (angle + 2 * Math.PI) % (2 * Math.PI);
		const sliceAngle = (2 * Math.PI) / slices.length;
		const sliceIndex = Math.floor(normalized / sliceAngle) % slices.length;

		const degrees = ((rotation * 180) / Math.PI) % 360;

		setMessage(
			`You clicked: ${slices[sliceIndex].label} | Rotation: ${degrees.toFixed(1)}°`
		);
	};


	const handleSetRotation = () => {
		const deg = parseFloat(inputDeg);
		if (!isNaN(deg)) {
		const radians = (deg * Math.PI) / 180;
		setRotation(radians);
		}
	};

	return (
		<div style={{ textAlign: "center" }}>
		<canvas
			ref={canvasRef}
			width={400}
			height={400}
			style={{ border: "1px solid black", cursor: "grab", touchAction: "none" }}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMoveCursor}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
			onClick={handleClick}
			onTouchStart={(e) => handleMouseDown(e.touches[0] as any)}
			onTouchMove={(e) => handleMouseMoveCursor(e.touches[0] as any)}
			onTouchEnd={handleMouseUp}
			/>

		<p style={{ fontSize: "20px", fontWeight: "bold" }}>{message}</p>

		<div style={{ marginTop: "10px" }}>
			<input
			type="number"
			value={inputDeg}
			onChange={(e) => setInputDeg(e.target.value)}
			placeholder="Enter rotation in degrees"
			/>
			<button onClick={handleSetRotation}>Rotate</button>
		</div>
		</div>
	);
};

export default SpinPie;
