"use client";

import { useState, useRef, useEffect } from "react";
import { ScrapbookElement as ScrapbookElementType, TextContent, StickerContent, PhotoContent } from "@/lib/scrapbook";

interface ScrapbookElementProps {
  element: ScrapbookElementType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ScrapbookElementType>) => void;
  onDelete: () => void;
  canvasScale: number;
}

export function ScrapbookElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  canvasScale,
}: ScrapbookElementProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, elementX: 0, elementY: 0 });
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelect();

    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      elementX: element.position_x,
      elementY: element.position_y,
    };
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, corner: string) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStart.current = {
      width: element.width,
      height: element.height,
      x: e.clientX,
      y: e.clientY,
    };
  };

  // Global mouse move and up handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = (e.clientX - dragStart.current.x) / canvasScale;
        const deltaY = (e.clientY - dragStart.current.y) / canvasScale;

        onUpdate({
          position_x: Math.max(0, dragStart.current.elementX + deltaX),
          position_y: Math.max(0, dragStart.current.elementY + deltaY),
        });
      }

      if (isResizing) {
        const deltaX = (e.clientX - resizeStart.current.x) / canvasScale;
        const deltaY = (e.clientY - resizeStart.current.y) / canvasScale;

        // Maintain minimum size
        const newWidth = Math.max(50, resizeStart.current.width + deltaX);
        const newHeight = Math.max(50, resizeStart.current.height + deltaY);

        onUpdate({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, canvasScale, onUpdate]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        if (!isEditing) {
          e.preventDefault();
          onDelete();
        }
      }

      if (e.key === "Escape") {
        setIsEditing(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelected, isEditing, onDelete]);

  // Handle text editing
  const handleDoubleClick = () => {
    if (element.element_type === "text") {
      setIsEditing(true);
    }
  };

  const handleTextChange = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.innerText;
    const content = element.content as TextContent;
    onUpdate({
      content: { ...content, text },
    });
  };

  const handleTextBlur = () => {
    setIsEditing(false);
  };

  // Render element content based on type
  const renderContent = () => {
    switch (element.element_type) {
      case "photo": {
        const content = element.content as PhotoContent;
        return (
          <img
            src={content.photoUrl}
            alt={content.caption || "Scrapbook photo"}
            className="w-full h-full object-cover rounded-lg"
            draggable={false}
          />
        );
      }

      case "text": {
        const content = element.content as TextContent;
        return (
          <div
            contentEditable={isEditing}
            suppressContentEditableWarning
            onInput={handleTextChange}
            onBlur={handleTextBlur}
            className={`w-full h-full p-2 outline-none ${isEditing ? "cursor-text" : "cursor-move"}`}
            style={{
              fontFamily: content.fontFamily || "inherit",
              fontSize: content.fontSize || 16,
              fontWeight: content.fontWeight || "normal",
              color: content.color || "#1E293B",
              backgroundColor: content.backgroundColor || "transparent",
              textAlign: content.textAlign || "left",
              overflow: "hidden",
            }}
          >
            {content.text || "Double-click to edit"}
          </div>
        );
      }

      case "sticker": {
        const content = element.content as StickerContent;
        return (
          <div className="w-full h-full flex items-center justify-center text-6xl select-none">
            {content.emoji || "⭐"}
          </div>
        );
      }

      default:
        return <div className="w-full h-full bg-gray-200 rounded-lg" />;
    }
  };

  return (
    <div
      ref={elementRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={`absolute ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${
        isSelected ? "ring-2 ring-electric-cyan ring-offset-2" : ""
      }`}
      style={{
        left: element.position_x,
        top: element.position_y,
        width: element.width,
        height: element.height,
        transform: `rotate(${element.rotation}deg)`,
        zIndex: element.z_index,
        willChange: isDragging || isResizing ? "transform" : "auto",
      }}
    >
      {/* Element content */}
      <div className="w-full h-full overflow-hidden rounded-lg shadow-sm">
        {renderContent()}
      </div>

      {/* Selection handles */}
      {isSelected && !isEditing && (
        <>
          {/* Corner resize handles */}
          {["se"].map((corner) => (
            <div
              key={corner}
              onMouseDown={(e) => handleResizeStart(e, corner)}
              className="absolute w-4 h-4 bg-white border-2 border-electric-cyan rounded-full cursor-se-resize hover:scale-110 transition-transform"
              style={{
                bottom: -8,
                right: -8,
              }}
            />
          ))}

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
