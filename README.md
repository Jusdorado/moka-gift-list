# 🎁 Moka Gift List

Una aplicación web moderna y elegante para gestionar listas de regalos, con actualización automática de precios y diseño premium.

## ✨ Características

- 🎨 **Diseño Premium**: Interfaz moderna con animaciones y tema visual cuidado.
- 📱 **Responsive**: Experiencia fluida en móvil y escritorio.
- 💰 **Precios en Tiempo Real**: Sistema de scraping para mantener los precios actualizados.
- 🔍 **Búsqueda Inteligente**: Filtrado por categorías, texto y estado.
- 🔐 **Panel de Administración**: Gestión segura de productos y categorías.
- 📄 **Exportación PDF**: Generación de listas de regalos en formato PDF.

## 🚀 Instalación y Uso

### Requisitos Previos

- Node.js 18+
- NPM o PNPM

### Configuración

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/moka-gift-list.git
cd moka-gift-list
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Crea un archivo `.env.local` basado en el ejemplo:
```bash
cp .env.local.example .env.local
```

### Desarrollo

```bash
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## 🛠️ Scripts de Mantenimiento

El proyecto incluye scripts para mantener la base de datos de productos actualizada:

```bash
# Actualizar precios, imágenes y sincronizar datos
npm run update-all

# Actualizar solo precios
npm run update-prices

# Extraer imágenes faltantes
npm run extract-images
```

## 📁 Estructura

- `/app`: Rutas y componentes de Next.js (App Router)
- `/components`: Componentes React reutilizables
- `/lib`: Utilidades y lógica de negocio (autenticación, DB)
- `/scripts`: Scripts de scraping y mantenimiento de datos
- `/data`: Archivos de datos locales (products.json)

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.
