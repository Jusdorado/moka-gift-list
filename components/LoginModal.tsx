'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, X } from 'lucide-react';

interface LoginModalProps {
  onLogin: (username: string, password: string) => void;
  onClose: () => void;
}

export default function LoginModal({ onLogin, onClose }: LoginModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Por favor completa todos los campos');
      return;
    }
    
    onLogin(username, password);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        style={{ background: 'var(--moka-50)' }}
      >
        {/* Header */}
        <div className="p-6 relative" style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-lg transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.2)' }}
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-white">Iniciar Sesión</h2>
          <p className="text-white/90 text-sm mt-1">Accede al panel de administración</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--moka-700)' }}>
              Usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--moka-500)' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
                style={{ borderColor: 'var(--moka-200)', color: 'var(--moka-900)', background: 'white' }}
                placeholder="Ingresa tu usuario"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--moka-700)' }}>
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--moka-500)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
                style={{ borderColor: 'var(--moka-200)', color: 'var(--moka-900)', background: 'white' }}
                placeholder="Ingresa tu contraseña"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 text-white font-bold rounded-xl hover:shadow-xl transition-all"
            style={{ background: 'linear-gradient(135deg, var(--gold-500), var(--gold-600))' }}
          >
            Iniciar Sesión
          </button>
        </form>
      </motion.div>
    </div>
  );
}
