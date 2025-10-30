import React, { useRef, useEffect, useCallback } from "react";

// Color mapping for different outcomes
const colorsMap: Record<string, string> = {
	"0": "#f94144",
	"1": "#f3722c",
	"2": "#f9c74f",
	"4": "#90be6d",
	"6": "#43aa8b",
	W: "#577590",
	NB: "#501111",
	WD: "#9b9b9b",
};

const WHEEL_SIZE = 60; // Even smaller size for the preset wheels
const WHEEL_SPACING = 10; // Smaller spacing between wheels

type PresetArray = string[];
type ModifiedPresets = PresetArray[];

interface PresetWheelProps {
	preset: PresetArray;
	selected?: boolean;
	onClick?: () => void;
}

const PresetWheel: React.FC<PresetWheelProps> = ({
	preset,
	selected,
	onClick,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	const drawWheel = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			const sliceAngle = (2 * Math.PI) / preset.length;
			const cx = ctx.canvas.width / 2;
			const cy = ctx.canvas.height / 2;
			const radius = WHEEL_SIZE / 2;

			ctx.save();

			// Slightly dim if not selected
			if (!selected) {
				ctx.globalAlpha = 0.5; // adjust between 0.4–0.7 to taste
			}

			// Draw each slice
			preset.forEach((outcome, i) => {
				const start = i * sliceAngle;
				const end = start + sliceAngle;

				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.arc(cx, cy, radius, start, end);
				ctx.closePath();
				ctx.fillStyle = colorsMap[outcome] || "#000000";
				ctx.fill();

				// Draw outcome label
				ctx.save();
				ctx.translate(cx, cy);
				ctx.rotate(start + sliceAngle / 2);
				ctx.textAlign = "right";
				ctx.fillStyle = "white";
				ctx.font = "8px sans-serif";
				ctx.fillText(outcome, radius - 5, 2);
				ctx.restore();
			});

			ctx.restore(); // restore alpha to 1.0 before applying glow

			// Draw selection indicator if selected
			if (selected) {
				// Outer glow halo (soft background ring)
				const gradient = ctx.createRadialGradient(
					cx,
					cy,
					radius - 10,
					cx,
					cy,
					radius + 15,
				);
				gradient.addColorStop(0, "rgba(255, 215, 0, 0)");
				gradient.addColorStop(0.8, "rgba(255, 215, 0, 0.4)");
				gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
				ctx.fillStyle = gradient;
				ctx.beginPath();
				ctx.arc(cx, cy, radius + 15, 0, 2 * Math.PI);
				ctx.fill();

				// Outer ring — bright gold
				ctx.shadowBlur = 20;
				ctx.shadowColor = "#ffcc00";
				ctx.strokeStyle = "#ffcc00";
				ctx.lineWidth = 6;
				ctx.beginPath();
				ctx.arc(cx, cy, radius + 4, 0, 2 * Math.PI);
				ctx.stroke();

				// Inner ring — crisp white for clarity
				ctx.shadowBlur = 0;
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.arc(cx, cy, radius - 1, 0, 2 * Math.PI);
				ctx.stroke();
			}
		},
		[preset, selected],
	);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		drawWheel(ctx);
	}, [drawWheel]);

	return (
		<canvas
			ref={canvasRef}
			width={WHEEL_SIZE}
			height={WHEEL_SIZE}
			onClick={() => {
				console.log("Clicked wheel with preset:", preset);
				onClick?.();
			}}
			style={{
				cursor: onClick ? "pointer" : "default",
				border: "1px solid #ddd",
				borderRadius: "50%",
				margin: `0 ${WHEEL_SPACING / 2}px`,
				backgroundColor: selected
					? "rgba(255, 215, 0, 0.1)"
					: "transparent",
				boxShadow: selected
					? "0 0 10px rgba(255, 215, 0, 0.3)"
					: "none",
				transform: selected ? "scale(1.05)" : "scale(1)",
				transition: "all 0.2s ease-in-out",
			}}
		/>
	);
};

interface FielderPresetsProps {
	modifiedPresets: ModifiedPresets; // More explicit about the type being string[][]
	selectedPreset?: number;
	onPresetClick?: (index: number) => void;
	style?: React.CSSProperties;
}

const FielderPresets: React.FC<FielderPresetsProps> = ({
	modifiedPresets,
	selectedPreset,
	onPresetClick,
	style = {},
}) => {
	return (
		<div
			style={{
				position: "absolute",
				bottom: "20px",
				right: "20px",
				display: "flex",
				alignItems: "center",
				backgroundColor: "rgba(255, 255, 255, 0.9)",
				padding: "10px",
				borderRadius: "8px",
				boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
				gap: WHEEL_SPACING,
				...style,
			}}
		>
			{modifiedPresets.map((preset, index) => (
				<PresetWheel
					key={index}
					preset={preset}
					selected={selectedPreset === index}
					onClick={
						onPresetClick ? () => onPresetClick(index) : undefined
					}
				/>
			))}
		</div>
	);
};

export default FielderPresets;
