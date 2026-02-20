# ✨ Moka Wish List

<div align="center">
  <img src="public/og-default.svg" alt="Moka Wish List Logo" width="160" />
  <p><em>Una plataforma premium y automatizada para gestionar tus deseos con elegancia.</em></p>

  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
</div>

---

## 📖 Introducción

**Moka Wish List** es una aplicación web de alto nivel diseñada para aquellos que buscan centralizar y monitorizar sus futuros descubrimientos. Más que una simple lista, es un asistente inteligente que se encarga del trabajo sucio: extraer precios, organizar categorías y presentar tus deseos con una estética impecable.

## 🚀 Características Estelares

### 🎨 Experiencia de Usuario "Premium"
*   **Glassmorphism UI**: Interfaz basada en capas traslúcidas y desenfoques sutiles que dan una sensación de profundidad y modernidad.
*   **Micro-interacciones**: Animaciones fluidas mediante *Framer Motion* que responden a cada clic y scroll.
*   **Modo Dark/Moka**: Una paleta de colores cuidadosamente seleccionada (marrones café, ocres y blancos crema) para una lectura descansada y elegante.

### 💰 Automatización de Precios (Scraping Engine)
*   **Monitorización en Tiempo Real**: La app no solo guarda el enlace, sino que entiende el contenido de la web de origen.
*   **Detección Multi-Tienda**: Reglas específicas para Amazon, Thomann, PC Componentes, El Corte Inglés, Casa del Libro, Zara, y más.
*   **Motor Genérico**: Capacidad de encontrar precios en casi cualquier web moderna mediante heurísticas de Regex.

### 🔐 Gestión Robusta
*   **Panel Administrativo**: Área privada protegida por credenciales para gestionar el inventario.
*   **Categorización Dinámica**: Sistema de campos inteligentes que cambian según el tipo de producto (autor para libros, talla/color para ropa, etc.).
*   **Exportación Profesional**: Genera recibos o listas en **PDF** con un solo clic, manteniendo la estética de la marca.

---

## 🏗️ Arquitectura del Sistema

```mermaid
graph TD
    A[Usuario / Frontend] -->|Interactúa| B[App Router Next.js]
    B -->|API Requests| C[API Routes]
    C -->|Fetch HTML| D[Scraping Engine]
    D -->|Regex parsing| E[Price / Metadata]
    C -->|Read/Write| F[Data Layer]
    F -->|Local| G[products.json]
    F -->|Cloud| H[Neon Postgres]
    B -->|Generate| I[PDF Export / OG Images]
```

### El Corazón del Scraping
El motor de extracción (`app/api/price/route.ts`) utiliza una jerarquía de prioridades:
1.  **Selectores de Dominio**: Si la URL es de una tienda conocida, usa patrones exactos (ej: `price-whole` en Amazon).
2.  **Meta-tags**: Busca en etiquetas OpenGraph y esquemas JSON-LD.
3.  **Heurística de Precios**: Si falla lo anterior, el motor recorre el HTML buscando el patrón de moneda (`X.XX€`) más probable de ser el precio actual.

---

## 🛠️ Instalación y Configuración

### Pasos Iniciales
```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/moka-wish-list.git

# Instalar dependencias
npm install
```

### Configuración del Entorno
Crea un archivo `.env.local` en la raíz. Este archivo es vital para la seguridad y el funcionamiento:

```env
# URL de Neon Postgres (Opcional, si prefieres nube a JSON local)
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb"

# Credenciales de acceso al Panel Admin
NEXT_PUBLIC_ADMIN_USER="tu_usuario"
NEXT_PUBLIC_ADMIN_PASS="tu_contraseña"
```

---

## 🧹 Mantenimiento y Scripts

El proyecto incluye potentes herramientas de línea de comandos para mantener tu lista limpia:

*   **`npm run update-prices`**: Recorre todos los productos y refresca sus precios conectándose a las tiendas.
*   **`npm run extract-images`**: Si has añadido productos sin foto, este script intenta localizarlas automáticamente.
*   **`npm run update-all`**: Ejecuta un ciclo completo de limpieza, actualización y sincronización.
*   **`npm run init-db`**: Prepara las tablas necesarias si decides migrar a Postgres.

---

## 📁 Estructura del Proyecto

```text
├── app/                # Lógica de rutas de Next.js (App Router)
│   ├── api/            # Endpoints de Scraping, Productos y OG
│   └── p/[id]/         # Páginas dinámicas de producto individual
├── components/         # Componentes React (Hero, Admin, Grid, etc.)
├── data/               # Base de datos local (products.json)
├── hooks/              # Custom hooks para lógica de UI y scroll
├── lib/                # Utilidades de DB y Autenticación
├── public/             # Assets estáticos (SVGs, favicon)
└── scripts/            # Scripts de automatización y scraping offline
```

---

## 🤝 Contribuir

¿Quieres añadir soporte para una nueva tienda o mejorar el diseño? ¡Las PRs son bienvenidas!

1. Haz un Fork del proyecto.
2. Crea una rama para tu característica (`git checkout -b feature/mejora`).
3. Haz commit de tus cambios (`git commit -m 'Añadir soporte para Tienda X'`).
4. Haz Push a la rama (`git push origin feature/mejora`).
5. Abre un Pull Request.

---

<div align="center">
  <p>Moka Wish List - Tu estilo, tus deseos, automatizados.</p>
</div>
