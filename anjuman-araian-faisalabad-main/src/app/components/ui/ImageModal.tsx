import { X } from "lucide-react";

interface ImageModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  if (!imageUrl) return null;

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.85)",
        zIndex: 9999, // Very high z-index to stay above other modals
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        backdropFilter: "blur(4px)"
      }}
      onClick={onClose} // Clicking background closes it
    >
      <div 
        style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()} // Prevent click from closing when clicking the image itself
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            backgroundColor: "white",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            color: "#b91c1c"
          }}
          title="Close Image"
        >
          <X size={20} />
        </button>
        <img 
          src={imageUrl} 
          alt="Enlarged View" 
          style={{ 
            maxWidth: "100%", 
            maxHeight: "90vh", 
            objectFit: "contain",
            borderRadius: 8,
            boxShadow: "0 10px 40px rgba(0,0,0,0.4)"
          }} 
        />
      </div>
    </div>
  );
}
