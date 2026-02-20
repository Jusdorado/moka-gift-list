import { useState, useEffect } from 'react';

interface PriceData {
  price: string | null;
  loading: boolean;
  error: string | null;
}

export function useRealTimePrice(url: string, enabled: boolean = true): PriceData {
  const [price, setPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !url) return;

    const fetchPrice = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/price?url=${encodeURIComponent(url)}`);
        const data = await response.json();

        if (data.success && data.price) {
          setPrice(data.price);
        } else {
          setError('No se pudo obtener el precio');
        }
      } catch (err) {
        setError('Error al obtener el precio');
        console.error('Error fetching price:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
  }, [url, enabled]);

  return { price, loading, error };
}
