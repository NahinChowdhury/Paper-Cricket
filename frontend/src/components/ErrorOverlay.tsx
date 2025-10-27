import React, { useEffect } from "react";
import { useSocket } from "../contexts/SocketContext";

const ErrorOverlay: React.FC = () => {
	const { error, setError } = useSocket();

	useEffect(() => {
		if (!error) return;
		const timer = setTimeout(() => setError(null), 5000);
		return () => clearTimeout(timer);
	}, [error, setError]);

	if (!error) return null;

	return (
		<div
			style={{
				position: "fixed",
				top: "20px",
				left: "50%",
				transform: "translateX(-50%)",
				backgroundColor: "#d32f2f",
				color: "white",
				padding: "14px 28px",
				borderRadius: "8px",
				boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
				zIndex: 9999,
				fontFamily: "sans-serif",
				fontSize: "16px",
				fontWeight: 600,
				textAlign: "center",
				cursor: "pointer",
			}}
			onClick={() => setError(null)}
		>
			⚠️ {error}
		</div>
	);
};

export default ErrorOverlay;
