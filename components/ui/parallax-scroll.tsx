"use client";
import { useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ParallaxPhoto {
  id: string;
  file_url: string;
  caption?: string | null;
  is_favorite?: boolean;
}

export const ParallaxPhotoGallery = ({
  photos,
  onPhotoClick,
  className,
}: {
  photos: ParallaxPhoto[];
  onPhotoClick?: (photo: ParallaxPhoto, index: number) => void;
  className?: string;
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: gridRef,
    offset: ["start start", "end start"],
  });

  const translateYFirst = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const translateXFirst = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const rotateFirst = useTransform(scrollYProgress, [0, 1], [0, -10]);

  const translateYThird = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const translateXThird = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const rotateThird = useTransform(scrollYProgress, [0, 1], [0, 10]);

  const third = Math.ceil(photos.length / 3);
  const firstPart = photos.slice(0, third);
  const secondPart = photos.slice(third, 2 * third);
  const thirdPart = photos.slice(2 * third);

  return (
    <div
      className={cn("h-[calc(100vh-200px)] items-start overflow-y-auto w-full", className)}
      ref={gridRef}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-start max-w-6xl mx-auto gap-6 py-10 px-4">
        <div className="grid gap-6">
          {firstPart.map((photo, idx) => (
            <motion.div
              style={{
                y: translateYFirst,
                x: translateXFirst,
                rotateZ: rotateFirst,
              }}
              key={photo.id}
              onClick={() => onPhotoClick?.(photo, idx)}
              className="cursor-pointer group relative"
            >
              <img
                src={photo.file_url}
                className="h-80 w-full object-cover rounded-xl shadow-lg transition-transform group-hover:scale-[1.02]"
                alt={photo.caption || "Photo"}
              />
              {photo.is_favorite && (
                <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5">
                  <svg className="w-4 h-4 text-vibrant-orange fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            </motion.div>
          ))}
        </div>
        <div className="grid gap-6">
          {secondPart.map((photo, idx) => (
            <motion.div
              key={photo.id}
              onClick={() => onPhotoClick?.(photo, third + idx)}
              className="cursor-pointer group relative"
            >
              <img
                src={photo.file_url}
                className="h-80 w-full object-cover rounded-xl shadow-lg transition-transform group-hover:scale-[1.02]"
                alt={photo.caption || "Photo"}
              />
              {photo.is_favorite && (
                <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5">
                  <svg className="w-4 h-4 text-vibrant-orange fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            </motion.div>
          ))}
        </div>
        <div className="grid gap-6">
          {thirdPart.map((photo, idx) => (
            <motion.div
              style={{
                y: translateYThird,
                x: translateXThird,
                rotateZ: rotateThird,
              }}
              key={photo.id}
              onClick={() => onPhotoClick?.(photo, 2 * third + idx)}
              className="cursor-pointer group relative"
            >
              <img
                src={photo.file_url}
                className="h-80 w-full object-cover rounded-xl shadow-lg transition-transform group-hover:scale-[1.02]"
                alt={photo.caption || "Photo"}
              />
              {photo.is_favorite && (
                <div className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5">
                  <svg className="w-4 h-4 text-vibrant-orange fill-current" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
