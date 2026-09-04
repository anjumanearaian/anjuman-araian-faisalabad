import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface LightboxGalleryProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function LightboxGallery({ images, initialIndex = 0, onClose }: LightboxGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length]);

  if (!images || images.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.9)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(5px)"
      }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          backgroundColor: "rgba(255,255,255,0.1)",
          border: "none",
          borderRadius: "50%",
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "white",
          zIndex: 10000,
          transition: "background-color 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
      >
        <X size={28} />
      </button>

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          style={{
            position: "absolute",
            left: 24,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "50%",
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "white",
            zIndex: 10000,
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
        >
          <ChevronLeft size={36} />
        </button>
      )}

      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "85vw", maxHeight: "85vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <img 
          src={images[currentIndex]} 
          alt={`Gallery view ${currentIndex + 1}`} 
          style={{ 
            maxWidth: "100%", 
            maxHeight: "85vh", 
            objectFit: "contain",
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
          }} 
        />
        
        {images.length > 1 && (
          <div style={{ position: "absolute", bottom: -40, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, letterSpacing: "0.1em" }}>
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
          style={{
            position: "absolute",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(255,255,255,0.1)",
            border: "none",
            borderRadius: "50%",
            width: 56,
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "white",
            zIndex: 10000,
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
        >
          <ChevronRight size={36} />
        </button>
      )}
    </div>
  );
}
