import React, { useEffect, useState, useCallback, useRef } from "react";

interface DraggableListProps<T> {
	items: T[];
	onReorder: (newItems: T[], specialIndex?: number | null) => void;
	renderItem: (item: T) => React.ReactNode;
	specialIndex?: number | null;
}

export function DraggableList<T>({
	items,
	onReorder,
	renderItem,
	specialIndex = null,
}: DraggableListProps<T>) {
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [displayOrder, setDisplayOrder] = useState<number[]>(() =>
		items.map((_, i) => i),
	);
	const [recentlyMovedPosition, setRecentlyMovedPosition] = useState<
		number | null
	>(null);
	const highlightTimeoutRef = useRef<number | null>(null);

	// keep in sync after reorder
	useEffect(() => {
		if (draggedIndex === null) {
			setDisplayOrder(items.map((_, i) => i));
		}
	}, [items, draggedIndex]);

	// cleanup highlight timeout on unmount
	useEffect(() => {
		return () => {
			if (highlightTimeoutRef.current) {
				window.clearTimeout(highlightTimeoutRef.current);
				highlightTimeoutRef.current = null;
			}
		};
	}, []);

	const canDrag = (i: number) => specialIndex === null || i === specialIndex;

	const reorderDisplay = (fromIdx: number, toIdx: number) => {
		setDisplayOrder((prev) => {
			const next = [...prev];
			next.splice(toIdx, 0, next.splice(fromIdx, 1)[0]);
			return next;
		});
	};

	// -----------------------
	// Drag Handlers
	// -----------------------

	const handleDragStart = (e: React.DragEvent, originalIndex: number) => {
		if (!canDrag(originalIndex)) {
			e.preventDefault();
			return;
		}

		// clear any existing highlight timeout when starting a new drag
		if (highlightTimeoutRef.current) {
			window.clearTimeout(highlightTimeoutRef.current);
			highlightTimeoutRef.current = null;
		}
		setRecentlyMovedPosition(null);

		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", originalIndex.toString());
		setDraggedIndex(originalIndex);
	};

	const handleDragEnter = (targetIndex: number) => {
		if (draggedIndex === null || draggedIndex === targetIndex) return;

		const from = displayOrder.indexOf(draggedIndex);
		const to = displayOrder.indexOf(targetIndex);

		if (from !== -1 && to !== -1 && from !== to) {
			reorderDisplay(from, to);
		}
	};

	const handleDrop = () => {
		if (draggedIndex === null) return;

		const newItems = displayOrder.map((i) => items[i]);
		const movedPosition = displayOrder.indexOf(draggedIndex);
		const movedSpecial =
			specialIndex === draggedIndex ? movedPosition : undefined;

		// If there's no specialIndex, highlight the dropped position briefly
		if (specialIndex === null && movedPosition !== -1) {
			// clear any existing timeout so the highlight duration restarts
			if (highlightTimeoutRef.current) {
				window.clearTimeout(highlightTimeoutRef.current);
				highlightTimeoutRef.current = null;
			}

			setRecentlyMovedPosition(movedPosition);
			// clear highlight after a short delay and store ref
			highlightTimeoutRef.current = window.setTimeout(() => {
				setRecentlyMovedPosition(null);
				highlightTimeoutRef.current = null;
			}, 800);
		}

		onReorder(newItems, movedSpecial ?? null);

		setDraggedIndex(null);
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
	};

	// -----------------------
	// Button move helpers
	// -----------------------

	const moveItem = useCallback(
		(index: number, dir: "up" | "down") => {
			if (!canDrag(index)) return;

			const newIndex = dir === "up" ? index - 1 : index + 1;
			if (newIndex < 0 || newIndex >= items.length) return;

			const newItems = [...items];
			[newItems[index], newItems[newIndex]] = [
				newItems[newIndex],
				newItems[index],
			];

			onReorder(
				newItems,
				specialIndex === index ? newIndex : specialIndex,
			);
		},
		[items, specialIndex, onReorder],
	);

	// -----------------------
	// Render
	// -----------------------

	return (
		<div
			className="draggable-list"
			onDragOver={(e) => e.preventDefault()}
			onDrop={handleDrop}
			onDragEnd={handleDragEnd}
		>
			{displayOrder.map((originalIndex, idx) => {
				const item = items[originalIndex];
				const isDragged = draggedIndex === originalIndex;
				const isSpecial = originalIndex === specialIndex;
				const isRecentlyMoved =
					recentlyMovedPosition === idx && specialIndex === null;

				const showControls =
					draggedIndex === null && canDrag(originalIndex);

				// Inline UI styles preserved exactly
				const cursor = specialIndex
					? isSpecial
						? isDragged
							? "grabbing"
							: "grab"
						: "not-allowed"
					: isDragged
						? "grabbing"
						: "grab";

				const backgroundColor = isDragged
					? "#cfeeff"
					: isRecentlyMoved
						? "#cfeeff"
						: isSpecial
							? "#ffd0eb"
							: "#f5f5f5";

				return (
					<div
						key={originalIndex}
						draggable={canDrag(originalIndex)}
						onDragStart={(e) => handleDragStart(e, originalIndex)}
						onDragEnter={() => handleDragEnter(originalIndex)}
						style={{
							padding: "10px",
							margin: "5px 0",
							cursor,
							opacity: isDragged ? 0.9 : 1,
							backgroundColor,
							border: isDragged
								? "3px dotted #1f6feb"
								: "1px solid #ddd",
							borderRadius: isDragged ? "6px" : "4px",
							boxShadow: isDragged
								? "0 10px 30px rgba(31,111,235,0.18)"
								: "none",
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							transition:
								"background-color 0.15s ease, opacity 0.08s ease, box-shadow 0.12s ease",
						}}
					>
						<div style={{ flex: 1 }}>{renderItem(item)}</div>

						{showControls && (
							<div>
								<button
									onClick={() =>
										moveItem(originalIndex, "up")
									}
									disabled={originalIndex === 0}
									style={{ marginRight: "5px" }}
								>
									↑
								</button>

								<button
									onClick={() =>
										moveItem(originalIndex, "down")
									}
									disabled={
										originalIndex === items.length - 1
									}
								>
									↓
								</button>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
