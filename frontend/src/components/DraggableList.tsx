import React, { useState } from "react";

interface DraggableListProps<T> {
	items: T[];
	onReorder: (newItems: T[]) => void;
	renderItem: (item: T) => React.ReactNode;
}

export function DraggableList<T>({
	items,
	onReorder,
	renderItem,
}: DraggableListProps<T>) {
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	// 🔹 Start dragging
	const handleDragStart = (e: React.DragEvent, index: number) => {
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", index.toString());
		setDraggedIndex(index);
	};

	// 🔹 When entering a new item
	const handleDragEnter = (index: number) => {
		if (index !== dragOverIndex) {
			setDragOverIndex(index);
		}
	};

	// 🔹 Required to allow dropping
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	// 🔹 Swap items on drop
	const handleDrop = (targetIndex: number) => {
		if (draggedIndex === null || draggedIndex === targetIndex) return;

		const newItems = [...items];
		[newItems[draggedIndex], newItems[targetIndex]] = [
			newItems[targetIndex],
			newItems[draggedIndex],
		];

		onReorder(newItems);
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	// 🔹 Move manually using buttons
	const moveItem = (index: number, direction: "up" | "down") => {
		const newIndex = direction === "up" ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= items.length) return;

		const newItems = [...items];
		[newItems[index], newItems[newIndex]] = [
			newItems[newIndex],
			newItems[index],
		];
		onReorder(newItems);
	};

	return (
		<div className="draggable-list">
			{items.map((item, index) => (
				<div
					key={index}
					draggable
					onDragStart={(e) => handleDragStart(e, index)}
					onDragEnter={() => handleDragEnter(index)}
					onDragOver={handleDragOver}
					onDrop={() => handleDrop(index)}
					style={{
						cursor: draggedIndex === index ? "grabbing" : "grab",
						padding: "10px",
						margin: "5px 0",
						backgroundColor:
							dragOverIndex === index
								? "#d0ebff"
								: draggedIndex === index
									? "#f1f3f5"
									: "#f5f5f5",
						border: "1px solid #ddd",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						transition: "background-color 0.15s ease",
					}}
				>
					<div style={{ flex: 1 }}>{renderItem(item)}</div>
					<div className="item-controls">
						<button
							onClick={() => moveItem(index, "up")}
							disabled={index === 0}
							style={{ marginRight: "5px" }}
						>
							↑
						</button>
						<button
							onClick={() => moveItem(index, "down")}
							disabled={index === items.length - 1}
						>
							↓
						</button>
					</div>
				</div>
			))}
		</div>
	);
}
