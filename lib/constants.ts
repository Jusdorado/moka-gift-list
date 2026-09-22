/* Tope de URLs por tanda en el alta masiva.

   No es un número al azar: la cuenta de Scrape.do permite 5 peticiones
   concurrentes (ConcurrentRequest: 5) y la extracción se lanza en paralelo,
   una petición por URL. Subirlo haría que las sobrantes fallasen por
   concurrencia. Además las dos webs comparten la misma cuenta. */
export const MAX_BULK_ADD = 5;
