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
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [canScroll, setCanScroll] = useState(false);
	const scrollIntervalRef = useRef<number | null>(null);
	const SCROLL_SPEED = 3; // pixels per frame
	const SCROLL_THRESHOLD = 50; // pixels from edge to start scrolling

	// keep in sync after reorder
	useEffect(() => {
		if (draggedIndex === null) {
			setDisplayOrder(items.map((_, i) => i));
		}
	}, [items, draggedIndex]);

	// cleanup highlight timeout and scroll interval on unmount
	useEffect(() => {
		return () => {
			if (highlightTimeoutRef.current) {
				window.clearTimeout(highlightTimeoutRef.current);
				highlightTimeoutRef.current = null;
			}
			stopAutoScroll();
		};
	}, []);

	// Track whether the list container is scrollable (used to show small scroll buttons)
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const update = () => setCanScroll(el.scrollHeight > el.clientHeight);
		update();

		// ResizeObserver to watch for content/size changes
		let ro: ResizeObserver | null = null;
		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(update);
			ro.observe(el);
		}

		window.addEventListener("resize", update);
		// Also watch for DOM changes that may affect scrollHeight (simple mutation observer)
		const mo = new MutationObserver(update);
		mo.observe(el, { childList: true, subtree: true, attributes: true });

		return () => {
			window.removeEventListener("resize", update);
			if (ro) ro.disconnect();
			mo.disconnect();
		};
	}, [items]);

	const canDrag = (i: number) => specialIndex === null || i === specialIndex;

	const startAutoScroll = (direction: "up" | "down") => {
		if (scrollIntervalRef.current) return; // Already scrolling

		scrollIntervalRef.current = window.setInterval(() => {
			const container = containerRef.current;
			if (!container) return;

			const scrollAmount =
				direction === "up" ? -SCROLL_SPEED : SCROLL_SPEED;
			container.scrollBy({ top: scrollAmount, behavior: "auto" });
		}, 16); // ~60fps
	};

	const stopAutoScroll = () => {
		if (scrollIntervalRef.current) {
			window.clearInterval(scrollIntervalRef.current);
			scrollIntervalRef.current = null;
		}
	};

	const checkAutoScroll = (clientY: number) => {
		const container = containerRef.current;
		if (!container || !canScroll) return;

		const rect = container.getBoundingClientRect();
		const topThreshold = rect.top + SCROLL_THRESHOLD;
		const bottomThreshold = rect.bottom - SCROLL_THRESHOLD;

		if (clientY < topThreshold) {
			startAutoScroll("up");
		} else if (clientY > bottomThreshold) {
			startAutoScroll("down");
		} else {
			stopAutoScroll();
		}
	};

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
		stopAutoScroll();
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
		stopAutoScroll();
	};

	// -----------------------
	// Touch Handlers (mobile)
	// -----------------------
	// Simulate drag & drop using touch events so dragging works on phones.
	// Note: avoid calling preventDefault on React touch events (passive listeners).
	// We use CSS touch-action on the container to disable scrolling while dragging.
	const handleTouchStart = (e: React.TouchEvent, originalIndex: number) => {
		if (!canDrag(originalIndex)) return;
		setDraggedIndex(originalIndex);
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (draggedIndex === null) return;
		// Do NOT call e.preventDefault() here because many browsers use passive touch listeners.
		// We rely on the container's `touch-action: none` while dragging to prevent scrolling.
		const touch = e.touches[0];
		if (!touch) return;

		// Check for auto-scrolling
		checkAutoScroll(touch.clientY);

		// element currently under the finger
		const el = document.elementFromPoint(
			touch.clientX,
			touch.clientY,
		) as HTMLElement | null;
		if (!el) return;
		const target = el.closest(
			"[data-original-index]",
		) as HTMLElement | null;
		if (!target) return;
		const targetIndexAttr = target.getAttribute("data-original-index");
		if (!targetIndexAttr) return;
		const targetIndex = Number(targetIndexAttr);
		if (!Number.isNaN(targetIndex)) {
			handleDragEnter(targetIndex);
		}
	};

	const handleTouchEnd = () => {
		if (draggedIndex === null) return;
		handleDrop();
		setDraggedIndex(null);
		stopAutoScroll();
	};

	// -----------------------
	// Prevent page scroll while touch-dragging (use non-passive native listener)
	// -----------------------
	// Some mobile browsers ignore preventDefault on passive React listeners.
	// Add a native listener with { passive: false } while an item is being dragged.
	useEffect(() => {
		const preventScroll = (e: TouchEvent) => {
			if (draggedIndex !== null) {
				e.preventDefault();
			}
		};

		document.addEventListener("touchmove", preventScroll, {
			passive: false,
		});

		return () => document.removeEventListener("touchmove", preventScroll);
	}, [draggedIndex]);

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

	// Small helper scroll functions for when the list overflows on small screens
	const scrollAmount = 80; // px per click (responsive feel)
	const scrollUp = () => {
		const el = containerRef.current;
		if (!el) return;
		el.scrollBy({ top: -scrollAmount, behavior: "smooth" });
	};
	const scrollDown = () => {
		const el = containerRef.current;
		if (!el) return;
		el.scrollBy({ top: scrollAmount, behavior: "smooth" });
	};

	// -----------------------
	// Render
	// -----------------------

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				alignItems: "center",
			}}
		>
			{/* Top scroll control */}
			{canScroll && (
				<button
					onClick={scrollUp}
					aria-label="Scroll up"
					style={{
						marginBottom: 6,
						width: 40,
						height: 32,
						borderRadius: 6,
						fontSize: "14px",
						padding: 0,
						background: "rgba(255,255,255,0.95)",
						border: "1px solid rgba(0,0,0,0.08)",
						boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
						cursor: "pointer",
					}}
				>
					▲
				</button>
			)}

			<div
				ref={containerRef}
				className="draggable-list"
				onDragOver={(e) => {
					e.preventDefault();
					if (draggedIndex !== null) {
						checkAutoScroll(e.clientY);
					}
				}}
				onDrop={handleDrop}
				onDragEnd={handleDragEnd}
				// While an item is being dragged (touch), prevent page scrolling.
				style={{
					width: "100%",
					maxHeight: "40vh",
					overflowY: "auto",
					touchAction: draggedIndex !== null ? "none" : "auto",
					fontSize: "clamp(12px, 1.4vmin, 14px)",
				}}
			>
				{displayOrder.map((originalIndex, idx) => {
					const item = items[originalIndex];
					const isDragged = draggedIndex === originalIndex;
					const isSpecial = originalIndex === specialIndex;
					const isRecentlyMoved =
						recentlyMovedPosition === idx && specialIndex === null;

					const showControls = canDrag(originalIndex);
					const controlsVisible =
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
							data-original-index={originalIndex}
							draggable={canDrag(originalIndex)}
							onDragStart={(e) =>
								handleDragStart(e, originalIndex)
							}
							onDragEnter={() => handleDragEnter(originalIndex)}
							onTouchStart={(e) =>
								handleTouchStart(e, originalIndex)
							}
							onTouchMove={handleTouchMove}
							onTouchEnd={handleTouchEnd}
							style={{
								padding: "clamp(6px, 1.2vmin, 10px)",
								margin: "clamp(4px, 0.8vmin, 6px) 0",
								cursor,
								opacity: isDragged ? 0.95 : 1,
								backgroundColor,
								border: isDragged
									? "2px dashed #1f6feb"
									: "1px solid #e6e6e6",
								borderRadius: "6px",
								boxShadow: isDragged
									? "0 8px 20px rgba(31,111,235,0.14)"
									: "none",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "8px",
								transition:
									"background-color 0.15s ease, opacity 0.08s ease, box-shadow 0.12s ease, transform 0.12s ease",
								transform: isDragged
									? "scale(1.02)"
									: "scale(1)",
							}}
						>
							<div style={{ flex: 1, minWidth: 0 }}>
								{renderItem(item)}
							</div>

							{/* Reserve space for controls so the row height stays constant while dragging.
								controlsVisible toggles opacity + pointer events so layout doesn't shift. */}
							{showControls && (
								<div
									style={{
										display: "flex",
										flexDirection: "row",
										alignItems: "center",
										gap: "6px",
										whiteSpace: "nowrap",
										flexShrink: 0,
										minWidth: "72px",
										justifyContent: "flex-end",
										opacity: controlsVisible ? 1 : 0,
										transition: "opacity 0.12s ease",
										pointerEvents: controlsVisible
											? "auto"
											: "none",
									}}
								>
									<button
										onClick={() =>
											moveItem(originalIndex, "up")
										}
										onTouchStart={(e) =>
											e.stopPropagation()
										}
										disabled={originalIndex === 0}
										style={{
											marginRight: 0,
											fontSize:
												"clamp(11px,1.2vmin,12px)",
											padding: "4px 6px",
											minWidth: "28px",
											height: "28px",
											lineHeight: 1,
											borderRadius: "4px",
										}}
									>
										↑
									</button>

									<button
										onClick={() =>
											moveItem(originalIndex, "down")
										}
										onTouchStart={(e) =>
											e.stopPropagation()
										}
										disabled={
											originalIndex === items.length - 1
										}
										style={{
											fontSize:
												"clamp(11px,1.2vmin,12px)",
											padding: "4px 6px",
											minWidth: "28px",
											height: "28px",
											lineHeight: 1,
											borderRadius: "4px",
										}}
									>
										↓
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Bottom scroll control */}
			{canScroll && (
				<button
					onClick={scrollDown}
					aria-label="Scroll down"
					style={{
						marginTop: 6,
						width: 40,
						height: 32,
						borderRadius: 6,
						fontSize: "14px",
						padding: 0,
						background: "rgba(255,255,255,0.95)",
						border: "1px solid rgba(0,0,0,0.08)",
						boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
						cursor: "pointer",
					}}
				>
					▼
				</button>
			)}
		</div>
	);
}
