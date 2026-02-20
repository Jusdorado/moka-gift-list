'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Category } from '../types';

interface CategoryNavProps {
    categories: Category[];
    activeCategory: string | null;
    onCategoryClick: (categoryId: string | null) => void;
}

export default function CategoryNav({ categories, activeCategory, onCategoryClick }: CategoryNavProps) {
    return (
        <nav className="sticky top-0 z-40 glass border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                    {/* All categories button */}
                    <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onCategoryClick(null)}
                        className={`group relative px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-300 overflow-hidden ${
                            activeCategory === null
                                ? 'bg-gradient-to-r from-primary-500 via-primary-600 to-accent-500 text-white shadow-xl'
                                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:shadow-lg'
                        }`}
                    >
                        {activeCategory === null && (
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-accent-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Todos los Productos
                        </span>
                    </motion.button>

                    {/* Category buttons */}
                    {categories.map((category) => (
                        <motion.button
                            key={category.id}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onCategoryClick(category.id)}
                            className={`relative px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all duration-300 overflow-hidden ${
                                activeCategory === category.id
                                    ? 'text-white shadow-xl'
                                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:shadow-lg'
                            }`}
                            style={{
                                backgroundColor: activeCategory === category.id ? category.color : undefined,
                                borderColor: activeCategory === category.id ? category.color : undefined,
                            }}
                        >
                            {activeCategory !== category.id && (
                                <div
                                    className="absolute inset-0 opacity-0 hover:opacity-10 transition-opacity duration-300"
                                    style={{ backgroundColor: category.color }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <span className="text-lg">{category.emoji}</span>
                                {category.name}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </div>
        </nav>
    );
}
