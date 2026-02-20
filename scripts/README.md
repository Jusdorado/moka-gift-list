# Scripts de Gestión de Productos

Scripts para mantener actualizada la información de productos.

## Scripts Disponibles

### 1. `update-prices.js`
Actualiza los precios de todos los productos extrayéndolos de las URLs originales.

```bash
node scripts/update-prices.js
```

### 2. `extract-images.js`
Extrae las imágenes de productos que no tienen imagen definida.

```bash
node scripts/extract-images.js
```

## Cómo funciona

1. **Edita `data/products.json`** directamente para añadir/modificar productos
2. **Ejecuta los scripts** para actualizar precios o extraer imágenes automáticamente
3. **La app lee `products.json`** y muestra los productos tal cual están

## Notas

- Los scripts modifican directamente `data/products.json`
- Se recomienda hacer commit antes de ejecutar los scripts
- Algunos sitios pueden bloquear las peticiones
- Las imágenes deben usar URLs `https://` (no `http://`)
