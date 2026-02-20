'use client';

import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle2, Package } from 'lucide-react';

interface ProgressTrackerProps {
    totalProducts: number;
    purchasedCount: number;
}

export default function ProgressTracker({ totalProducts, purchasedCount }: ProgressTrackerProps) {
    const percentage = totalProducts > 0 ? (purchasedCount / totalProducts) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 mb-8 border border-gray-200"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Progreso de Compras</h3>
                        <p className="text-sm text-gray-600">Sigue tu avance</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-bold gradient-text">
                        {purchasedCount}<span className="text-gray-400 text-2xl">/{totalProducts}</span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">productos</p>
                </div>
            </div>

            <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 rounded-full"
                />
            </div>

            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                    {percentage === 100 ? (
                        <>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-sm font-semibold text-green-600">
                                ¡Completado! 🎉
                            </span>
                        </>
                    ) : (
                        <>
                            <Package className="w-5 h-5 text-gray-500" />
                            <span className="text-sm font-medium text-gray-600">
                                {percentage.toFixed(0)}% completado
                            </span>
                        </>
                    )}
                </div>
                <span className="text-xs text-gray-500 font-medium">
                    {totalProducts - purchasedCount} restantes
                </span>
            </div>
        </motion.div>
    );
}
