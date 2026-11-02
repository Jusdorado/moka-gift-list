'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface PhotoLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/* Vista de la foto a pantalla completa, encima del popup de producto.
   Se renderiza fuera del popup (el transform del popup rompería el overlay fijo). */
export default function PhotoLightbox({ src, alt, onClose }: PhotoLightboxProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div onClick={onClose} className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      <button
        onClick={onClose}
        aria-label="Cerrar foto"
        className="absolute top-4 right-4 z-10 p-2 rounded-full transition-all hover:scale-110"
        style={{ background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)' }}
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <img
        src={src}
        alt={alt}
        className="relative max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
      />
    </motion.div>
  );
}
