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
	const containerRef = useRef<HTMLDivElement | null>(null);

	const drawWheel = useCallback(
		(ctx: CanvasRenderingContext2D) => {
			const dpr = window.devicePixelRatio || 1;
			const cssWidth = ctx.canvas.width / dpr;
			const cssHeight = ctx.canvas.height / dpr;
			const sliceAngle = (2 * Math.PI) / Math.max(1, preset.length);
			const cx = cssWidth / 2;
			const cy = cssHeight / 2;
			const radius = Math.min(cssWidth, cssHeight) / 2;

			// Clear (in CSS pixels; context already scaled)
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

			// Slightly dim if not selected
			if (!selected) {
				ctx.globalAlpha = 0.6;
			}

			// Draw each slice
			preset.forEach((outcome, i) => {
				const start = i * sliceAngle - Math.PI / 2;
				const end = start + sliceAngle;

				ctx.beginPath();
				ctx.moveTo(cx, cy);
				ctx.arc(cx, cy, radius, start, end);
				ctx.closePath();
				ctx.fillStyle = colorsMap[outcome] || "#000000";
				ctx.fill();

				// Draw outcome label (scale font with radius, cap for small screens)
				ctx.save();
				ctx.translate(cx, cy);
				ctx.rotate(start + sliceAngle / 2);
				ctx.textAlign = "right";
				// Compute a responsive font size: use a smaller scale to keep labels compact on all screens
				const computedFontSize = Math.max(
					6,
					Math.min(Math.round(radius * 0.12), 20), // smaller multiplier and lower max
				);
				ctx.fillStyle = "white";
				ctx.font = `${computedFontSize}px sans-serif`;
				// Position offsets that scale with radius.
				// For small wheels, reduce the radius offset so labels sit closer to the edge.
				const labelRadiusOffset =
					radius < 28
						? Math.max(3, Math.round(radius * 0.08))
						: Math.max(6, Math.round(radius * 0.12));
				// Slightly smaller vertical offset on tiny wheels
				const labelYAxisOffset =
					radius < 28
						? Math.max(1, Math.round(radius * 0.03))
						: Math.max(2, Math.round(radius * 0.04));
				ctx.fillText(
					outcome,
					radius - labelRadiusOffset,
					labelYAxisOffset,
				);
				ctx.restore();
			});

			// restore alpha
			ctx.globalAlpha = 1;

			// Draw selection indicator if selected
			if (selected) {
				const gradient = ctx.createRadialGradient(
					cx,
					cy,
					Math.max(0, radius - 8),
					cx,
					cy,
					radius + 12,
				);
				gradient.addColorStop(0, "rgba(255, 215, 0, 0)");
				gradient.addColorStop(0.75, "rgba(255, 215, 0, 0.35)");
				gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
				ctx.fillStyle = gradient;
				ctx.beginPath();
				ctx.arc(cx, cy, radius + 12, 0, 2 * Math.PI);
				ctx.fill();

				ctx.shadowBlur = 12;
				ctx.shadowColor = "#ffcc00";
				ctx.strokeStyle = "#ffcc00";
				ctx.lineWidth = Math.max(2, radius * 0.12);
				ctx.beginPath();
				ctx.arc(
					cx,
					cy,
					radius + Math.max(2, radius * 0.06),
					0,
					2 * Math.PI,
				);
				ctx.stroke();

				ctx.shadowBlur = 0;
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = Math.max(1, radius * 0.06);
				ctx.beginPath();
				ctx.arc(
					cx,
					cy,
					radius - Math.max(1, radius * 0.03),
					0,
					2 * Math.PI,
				);
				ctx.stroke();
			}
		},
		[preset, selected],
	);

	useEffect(() => {
		const resize = () => {
			const canvas = canvasRef.current;
			const container = containerRef.current;
			if (!canvas || !container) return;
			const rect = container.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;
			const cssW = Math.max(8, Math.floor(rect.width));
			const cssH = Math.max(8, Math.floor(rect.height));
			// set CSS size
			canvas.style.width = `${cssW}px`;
			canvas.style.height = `${cssH}px`;
			// set internal pixel buffer for crisp rendering
			canvas.width = Math.floor(cssW * dpr);
			canvas.height = Math.floor(cssH * dpr);
			const ctx = canvas.getContext("2d");
			if (!ctx) return;
			// reset transform and scale for device pixel ratio
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.scale(dpr, dpr);
			drawWheel(ctx);
		};

		resize();
		const ro = new ResizeObserver(resize);
		if (containerRef.current) ro.observe(containerRef.current);
		window.addEventListener("resize", resize);
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", resize);
		};
	}, [drawWheel]);

	const sizeStyle: React.CSSProperties = {
		width: "clamp(28px, 5.2vmin, 60px)",
		height: "clamp(28px, 5.2vmin, 60px)",
		margin: "clamp(4px, 1vmin, 8px)",
		display: "inline-block",
		boxSizing: "border-box",
		verticalAlign: "middle",
	};

	return (
		<div ref={containerRef} style={sizeStyle} onClick={onClick}>
			<canvas
				ref={canvasRef}
				width={60}
				height={60}
				style={{
					width: "100%",
					height: "100%",
					cursor: onClick ? "pointer" : "default",
					border: "1px solid #ddd",
					borderRadius: "50%",
					backgroundColor: selected
						? "rgba(255,215,0,0.06)"
						: "transparent",
					boxShadow: selected
						? "0 0 8px rgba(255,215,0,0.22)"
						: "none",
					transition: "transform 0.16s ease-in-out",
					transform: selected ? "scale(1.05)" : "scale(1)",
					display: "block",
				}}
			/>
		</div>
	);
};

interface FielderPresetsProps {
	modifiedPresets: ModifiedPresets;
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
				backgroundColor: "rgba(255,255,255,0.5)",
				padding: "clamp(6px,1.2vmin,10px)",
				borderRadius: "8px",
				boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
				gap: "clamp(6px, 1.2vmin, 12px)",
				// Allow horizontal scrolling if there are many presets
				overflowX: "auto",
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
