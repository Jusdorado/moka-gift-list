'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Check, Heart, Calendar, Euro } from 'lucide-react';

export default function Footer() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  return (
    <footer
      className="relative text-white py-16 mt-20 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #3c2a21 0%, #2b1b12 50%, #1a120b 100%)',
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full blur-3xl" style={{ background: 'var(--gold-400)' }} />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl" style={{ background: 'var(--moka-500)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Budget */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'rgba(248, 244, 239, 0.06)',
              border: '1px solid rgba(248,244,239,0.12)',
              boxShadow: '0 20px 80px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
              style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}
            >
              <Euro className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#eaddd1' }}>
              Presupuesto Aproximado
            </h3>
            <p className="text-3xl font-bold gradient-text">650-800€</p>
          </motion.div>

          {/* Date */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'rgba(248, 244, 239, 0.06)',
              border: '1px solid rgba(248,244,239,0.12)',
              boxShadow: '0 20px 80px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
              style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}
            >
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#eaddd1' }}>
              Última Actualización
            </h3>
            <p className="text-xl font-bold" style={{ color: '#f8f5f0' }}>7 Diciembre 2025</p>
          </motion.div>

          {/* Share */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl p-6 flex flex-col items-center justify-center"
            style={{
              background: 'rgba(248, 244, 239, 0.06)',
              border: '1px solid rgba(248,244,239,0.12)',
              boxShadow: '0 20px 80px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: '#eaddd1' }}>
              Compartir Lista
            </h3>
            <button
              onClick={handleShare}
              className="group relative inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(135deg, var(--gold-600), var(--moka-400))' }}
              />
              {copied ? (
                <>
                  <Check className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Compartir</span>
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* Bottom */}
        <div className="text-center pt-8 border-t" style={{ borderColor: 'rgba(248,244,239,0.12)' }}>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2"
            style={{ color: '#d5c7bd' }}
          >
            Hecho con <Heart className="w-4 h-4 text-red-400 fill-red-400 animate-pulse" /> para Möka
          </motion.p>
        </div>
      </div>
    </footer>
  );
}
