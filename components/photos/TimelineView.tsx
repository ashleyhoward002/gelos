"use client";

import { useMemo } from "react";
import { Photo } from "@/lib/photos";
import { MasonryGrid } from "./MasonryGrid";

interface TimelineViewProps {
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

export function TimelineView({
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
}: TimelineViewProps) {
  // Group photos by month
  const photosByMonth = useMemo(() => {
    const groups: Record<string, Photo[]> = {};

    for (const photo of photos) {
      const date = new Date(photo.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(photo);
    }

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a)) // Sort descending (newest first)
      .map(([key, monthPhotos]) => {
        const [year, month] = key.split("-").map(Number);
        return {
          key,
          label: new Date(year, month).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
          photos: monthPhotos,
        };
      });
  }, [photos]);

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {photosByMonth.map(({ key, label, photos: monthPhotos }) => (
        <div key={key}>
          <div className="sticky top-0 z-10 bg-bright-white/95 backdrop-blur py-2 mb-3">
            <h3 className="font-heading font-bold text-lg text-slate-dark">
              {label}
            </h3>
            <p className="text-sm text-slate-medium">
              {monthPhotos.length} photo{monthPhotos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <MasonryGrid
            photos={monthPhotos}
            onPhotoClick={onPhotoClick}
            onToggleFavorite={onToggleFavorite}
            onDoubleTap={onDoubleTap}
            selectedPhotos={selectedPhotos}
            selectionMode={selectionMode}
            uploaderColors={uploaderColors}
            getUploaderName={getUploaderName}
            doubleTapAnim={doubleTapAnim}
            columns={columns}
          />
        </div>
      ))}
    </div>
  );
}

export default TimelineView;
