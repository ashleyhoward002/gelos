"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Photo } from "@/lib/photos";

interface MasonryGridProps {
  photos: Photo[];
  onPhotoClick: (photoId: string) => void;
  onToggleFavorite: (photoId: string, e: React.MouseEvent) => void;
  onDoubleTap: (photoId: string) => void;
  selectedPhotos: Set<string>;
  selectionMode: boolean;
  uploaderColors: Record<string, string>;
  getUploaderName: (photo: Photo) => string;
  doubleTapAnim: string | null;
  columns?: number;
}

export function MasonryGrid({
  photos,
  onPhotoClick,
  onToggleFavorite,
  onDoubleTap,
  selectedPhotos,
  selectionMode,
  uploaderColors,
  getUploaderName,
  doubleTapAnim,
  columns = 2,
}: MasonryGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});

  // Distribute photos into columns based on actual image heights
  const columnPhotos = useMemo(() => {
    const cols: Photo[][] = Array.from({ length: columns }, () => []);
    const colHeights = Array(columns).fill(0);

    for (const photo of photos) {
      // Find the shortest column
      const shortestCol = colHeights.indexOf(Math.min(...colHeights));
      cols[shortestCol].push(photo);
      // Estimate height (or use actual if loaded)
      const estimatedHeight = imageHeights[photo.id] || 200;
      colHeights[shortestCol] += estimatedHeight + 8; // 8px gap
    }

    return cols;
  }, [photos, columns, imageHeights]);

  // Track image heights as they load
  const handleImageLoad = (photoId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const aspectRatio = img.naturalHeight / img.naturalWidth;
    const containerWidth = (containerRef.current?.clientWidth || 300) / columns - 8;
    const height = containerWidth * aspectRatio;

    setImageHeights(prev => ({ ...prev, [photoId]: height }));
  };

  return (
    <div ref={containerRef} className="flex gap-2">
      {columnPhotos.map((colPhotos, colIndex) => (
        <div key={colIndex} className="flex-1 flex flex-col gap-2">
          {colPhotos.map((photo) => (
            <MasonryPhoto
              key={photo.id}
              photo={photo}
              onClick={() => onPhotoClick(photo.id)}
              onToggleFavorite={(e) => onToggleFavorite(photo.id, e)}
              onDoubleTap={() => onDoubleTap(photo.id)}
              onImageLoad={(e) => handleImageLoad(photo.id, e)}
              isSelected={selectedPhotos.has(photo.id)}
              selectionMode={selectionMode}
              uploaderColor={uploaderColors[getUploaderName(photo)] || "#00D4FF"}
              uploaderName={getUploaderName(photo)}
              showDoubleTapAnim={doubleTapAnim === photo.id}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface MasonryPhotoProps {
  photo: Photo;
  onClick: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onDoubleTap: () => void;
  onImageLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  isSelected: boolean;
  selectionMode: boolean;
  uploaderColor: string;
  uploaderName: string;
  showDoubleTapAnim: boolean;
}

function MasonryPhoto({
  photo,
  onClick,
  onToggleFavorite,
  onDoubleTap,
  onImageLoad,
  isSelected,
  selectionMode,
  uploaderColor,
  uploaderName,
  showDoubleTapAnim,
}: MasonryPhotoProps) {
  const lastTapRef = useRef(0);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      onDoubleTap();
    } else {
      onClick();
    }
    lastTapRef.current = now;
  };

  return (
    <div
      onClick={handleTap}
      className={`relative rounded-xl overflow-hidden bg-white shadow-sm cursor-pointer group ${
        isSelected ? "ring-4 ring-electric-cyan" : ""
      }`}
    >
      <img
        src={photo.file_url}
        alt={photo.caption || ""}
        loading="lazy"
        onLoad={onImageLoad}
        className={`w-full object-cover transition-transform group-hover:scale-105 ${
          isSelected ? "opacity-80" : ""
        }`}
      />

      {/* Event overlay */}
      {photo.outing && (
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
          <span className="text-white text-xs font-semibold uppercase tracking-wide opacity-90">
            {photo.outing.title}
          </span>
        </div>
      )}

      {/* Double tap heart animation */}
      {showDoubleTapAnim && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-5xl animate-ping">❤️</span>
        </div>
      )}

      {/* Selection checkbox */}
      {selectionMode && (
        <div className={`absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center ${
          isSelected ? "bg-electric-cyan border-electric-cyan" : "bg-white/80 border-slate-medium"
        }`}>
          {isSelected && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}

      {/* Favorite button */}
      {!selectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full transition-all ${
            photo.is_favorite
              ? "bg-electric-cyan text-white"
              : "bg-white/80 text-slate-medium opacity-0 group-hover:opacity-100"
          }`}
        >
          <svg
            className="w-4 h-4"
            fill={photo.is_favorite ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between p-2 bg-white">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: uploaderColor }} />
          <span className="text-xs font-semibold text-slate-dark truncate">{uploaderName}</span>
        </div>
        <span className="text-xs text-slate-light flex-shrink-0">
          {new Date(photo.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
    </div>
  );
}

export default MasonryGrid;
