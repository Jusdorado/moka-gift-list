import { useEffect } from 'react';

/**
 * Hook que bloquea el scroll del body cuando un modal/popup está abierto
 * Permite scroll DENTRO del modal/popup, pero bloquea el scroll de la página de fondo
 * Funciona en móvil (bloquea touch events) y desktop
 * 
 * @param isLocked - Boolean que indica si el scroll debe estar bloqueado
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    // Guardar estilos originales
    const html = document.documentElement;
    const body = document.body;

    // Calcular ancho de la scrollbar para evitar layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Guardar posición de scroll actual
    const scrollY = window.scrollY;

    // Bloquear scroll en html y body
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.paddingRight = `${scrollbarWidth}px`;

    // Función para prevenir scroll con wheel - pero permitir en elementos scrollables
    const preventWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      // Permitir scroll si el elemento o sus padres tienen overflow: auto/scroll
      const isScrollable = target.closest('[data-scrollable], .overflow-auto, .overflow-y-auto, [style*="overflow"]');
      if (!isScrollable) {
        e.preventDefault();
      }
    };

    // Función para prevenir scroll con touch - pero permitir en elementos scrollables
    const preventTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      // Permitir scroll si el elemento o sus padres tienen overflow: auto/scroll
      const isScrollable = target.closest('[data-scrollable], .overflow-auto, .overflow-y-auto, [style*="overflow"]');
      if (!isScrollable) {
        e.preventDefault();
      }
    };

    // Agregar event listeners
    document.addEventListener('wheel', preventWheel, { passive: false });
    document.addEventListener('touchmove', preventTouch, { passive: false });

    // Cleanup: Restaurar estilos originales SIN SALTOS
    return () => {
      document.removeEventListener('wheel', preventWheel);
      document.removeEventListener('touchmove', preventTouch);

      // Restaurar estilos en el orden correcto para evitar saltos
      // 1. Remover position fixed del body (pero mantener el top negativo temporalmente)
      body.style.position = '';
      
      // 2. Restaurar overflow para que el scroll vuelva a funcionar
      html.style.overflow = '';
      body.style.overflow = '';
      
      // 3. Remover los estilos de posicionamiento
      body.style.top = '';
      body.style.width = '';
      body.style.paddingRight = '';

      // 4. Restaurar el scroll a la posición guardada de forma sincrónica
      // Esto debe hacerse DESPUÉS de remover position: fixed
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
    };
  }, [isLocked]);
}
