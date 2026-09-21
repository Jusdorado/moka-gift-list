/* Estadísticas de uso de la cuenta de Scrape.do.

   Endpoint real: GET https://api.scrape.do/info?token=<KEY>
   Respuesta:
     { IsActive, ConcurrentRequest, MaxMonthlyRequest,
       RemainingConcurrentRequest, RemainingMonthlyRequest }

   Scrape.do no expone /account/usage ni acepta cabecera Bearer: devuelve 403. */

export type ScrapeDoUsage = {
  used: number;
  limit: number;
  percentage: number;
  remaining: number;
};

export async function getScrapeDoUsage(apiKey: string): Promise<ScrapeDoUsage | null> {
  try {
    const res = await fetch(`https://api.scrape.do/info?token=${encodeURIComponent(apiKey)}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error(`[Scrape.do] info error ${res.status}:`, await res.text());
      return null;
    }

    const data = await res.json();
    const limit = data.MaxMonthlyRequest;
    const remaining = data.RemainingMonthlyRequest;

    if (typeof limit !== 'number' || typeof remaining !== 'number' || limit <= 0) {
      console.warn('[Scrape.do] Formato de respuesta inesperado:', data);
      return null;
    }

    const used = limit - remaining;
    return {
      used,
      limit,
      // Un decimal, igual que el dashboard de Scrape.do (p.ej. 4.10%)
      percentage: Math.round((used / limit) * 1000) / 10,
      remaining,
    };
  } catch (error) {
    console.error('[Scrape.do] Fallo al consultar el uso:', error);
    return null;
  }
}
