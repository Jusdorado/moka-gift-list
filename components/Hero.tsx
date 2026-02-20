'use client';

import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';

interface HeroProps {
    onExploreClick: () => void;
    productCount: number;
}

export default function Hero({ onExploreClick, productCount }: HeroProps) {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
            {/* Simple gradient background */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--moka-50), var(--moka-100))' }} />
            
            {/* Subtle gradient orb */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'var(--gold-400)', opacity: 0.1 }} />

            {/* Content */}
            <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-6xl md:text-8xl font-bold mb-6 leading-tight tracking-tight"
                >
                    Lista de Regalos
                    <br />
                    <span className="gradient-text">Möka 2025</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl mb-12"
                    style={{ color: 'var(--moka-600)' }}
                >
                    {productCount} productos seleccionados
                </motion.p>

                {/* Scroll indicator */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    onClick={onExploreClick}
                    className="inline-flex items-center gap-2 transition-colors group"
                    style={{ color: 'var(--moka-600)' }}
                >
                    <span className="text-sm font-medium">Ver productos</span>
                    <ArrowDown className="w-4 h-4 group-hover:translate-y-1 transition-transform" style={{ color: 'var(--gold-500)' }} />
                </motion.button>
            </div>
        </section>
    );
}
