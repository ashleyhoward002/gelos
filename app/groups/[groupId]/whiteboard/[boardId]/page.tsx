"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  getWhiteboard,
  getWhiteboardElements,
  createElement,
  deleteElement,
  clearBoard,
  WhiteboardBoard,
  WhiteboardElement,
  PathContent,
} from "@/lib/whiteboard";
import Header from "@/components/Header";

type Tool = "pen" | "marker" | "highlighter" | "eraser";

const COLORS = [
  "#000000", "#374151", "#EF4444", "#F97316", "#EAB308",
  "#22C55E", "#00D4FF", "#3B82F6", "#8B5CF6", "#EC4899",
];

const STROKE_WIDTHS = [2, 4, 8, 16];

export default function WhiteboardCanvasPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const boardId = params.boardId as string;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState<WhiteboardBoard | null>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [loading, setLoading] = useState(true);

  // Drawing state
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<[number, number][]>([]);

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadData();
    const cleanup = setupRealtime();

    // Resize canvas to fit container
    const handleResize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cleanup();
    };
  }, [boardId]);

  // Redraw canvas when elements change
  useEffect(() => {
    redrawCanvas();
  }, [elements, canvasSize, currentPath]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function loadData() {
    setLoading(true);

    const boardData = await getWhiteboard(boardId);
    if (!boardData) {
      router.push(`/groups/${groupId}/whiteboard`);
      return;
    }
    setBoard(boardData);

    const elementsData = await getWhiteboardElements(boardId);
    setElements(elementsData);
    setLoading(false);
  }

  function setupRealtime() {
    const supabase = createClient();

    // Subscribe to changes on whiteboard_elements for this board
    const channel = supabase
      .channel(`whiteboard:${boardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whiteboard_elements",
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setElements((prev) => [...prev, payload.new as WhiteboardElement]);
          } else if (payload.eventType === "UPDATE") {
            setElements((prev) =>
              prev.map((el) =>
                el.id === payload.new.id ? (payload.new as WhiteboardElement) : el
              )
            );
          } else if (payload.eventType === "DELETE") {
            setElements((prev) => prev.filter((el) => el.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = board?.background_color || "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw all elements
    for (const element of elements) {
      if (element.element_type === "path") {
        drawPath(ctx, element.content as PathContent);
      }
    }

    // Draw current path if drawing
    if (currentPath.length > 0) {
      drawPath(ctx, {
        points: currentPath,
        strokeColor: tool === "eraser" ? board?.background_color || "#FFFFFF" : color,
        strokeWidth: tool === "eraser" ? strokeWidth * 3 : strokeWidth,
        tool: tool === "eraser" ? "pen" : tool,
      });
    }
  }, [elements, currentPath, board, color, strokeWidth, tool]);

  function drawPath(ctx: CanvasRenderingContext2D, content: PathContent) {
    if (content.points.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = content.strokeColor;
    ctx.lineWidth = content.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (content.tool === "highlighter") {
      ctx.globalAlpha = 0.4;
    } else if (content.tool === "marker") {
      ctx.globalAlpha = 0.8;
    }

    ctx.moveTo(content.points[0][0], content.points[0][1]);
    for (let i = 1; i < content.points.length; i++) {
      ctx.lineTo(content.points[i][0], content.points[i][1]);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Drawing handlers
  const getPointerPosition = (e: React.PointerEvent): [number, number] => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0];
    return [e.clientX - rect.left, e.clientY - rect.top];
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const [x, y] = getPointerPosition(e);
    setIsDrawing(true);
    setCurrentPath([[x, y]]);

    // Capture pointer for smooth drawing
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const [x, y] = getPointerPosition(e);
    setCurrentPath((prev) => [...prev, [x, y]]);
  };

  const handlePointerUp = async () => {
    if (!isDrawing || currentPath.length < 2) {
      setIsDrawing(false);
      setCurrentPath([]);
      return;
    }

    // Save the path to database
    const content: PathContent = {
      points: currentPath,
      strokeColor: tool === "eraser" ? board?.background_color || "#FFFFFF" : color,
      strokeWidth: tool === "eraser" ? strokeWidth * 3 : strokeWidth,
      tool: tool === "eraser" ? "pen" : tool,
    };

    const result = await createElement(boardId, "path", content);
    if (!result.success) {
      setToast({ message: "Failed to save drawing", type: "error" });
    }

    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleClear = async () => {
    if (!confirm("Clear all your drawings from this board?")) return;
    const result = await clearBoard(boardId);
    if (result.success) {
      setToast({ message: "Your drawings cleared", type: "success" });
      loadData();
    } else {
      setToast({ message: result.error || "Failed to clear", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bright-white">
        <Header showBack backHref={`/groups/${groupId}/whiteboard`} title="Loading..." />
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-cyan"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bright-white">
      <Header
        showBack
        backHref={`/groups/${groupId}/whiteboard`}
        title={board?.title || "Whiteboard"}
      />

      {/* Toolbar */}
      <div className="flex-shrink-0 p-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 overflow-x-auto max-w-4xl mx-auto">
          {/* Tools */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {(["pen", "marker", "highlighter", "eraser"] as Tool[]).map((t) => (
              <button
                key={t}
                onClick={() => setTool(t)}
                className={`p-2 rounded-lg transition-colors ${
                  tool === t
                    ? "bg-electric-cyan text-white"
                    : "text-slate-dark hover:bg-gray-200"
                }`}
                title={t.charAt(0).toUpperCase() + t.slice(1)}
              >
                {t === "pen" && "✏️"}
                {t === "marker" && "🖊️"}
                {t === "highlighter" && "🖍️"}
                {t === "eraser" && "🧽"}
              </button>
            ))}
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Colors */}
          <div className="flex gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                disabled={tool === "eraser"}
                className={`w-7 h-7 rounded-full transition-transform border-2 ${
                  color === c && tool !== "eraser"
                    ? "scale-110 border-slate-dark"
                    : "border-transparent hover:scale-105"
                } ${tool === "eraser" ? "opacity-50" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="w-px h-8 bg-gray-200" />

          {/* Stroke width */}
          <div className="flex gap-1 items-center">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`p-2 rounded-lg transition-colors ${
                  strokeWidth === w ? "bg-gray-200" : "hover:bg-gray-100"
                }`}
              >
                <div
                  className="bg-slate-dark rounded-full"
                  style={{ width: Math.min(w * 1.5, 20), height: Math.min(w * 1.5, 20) }}
                />
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Clear button */}
          <button
            onClick={handleClear}
            className="px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear Mine
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="touch-none"
          style={{
            backgroundColor: board?.background_color || "#FFFFFF",
            cursor: tool === "eraser" ? "cell" : "crosshair",
          }}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 left-4 right-4 max-w-md mx-auto p-4 rounded-xl shadow-lg z-50 ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          } text-white font-medium text-center`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
