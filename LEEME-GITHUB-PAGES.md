# Buscador Barniture en GitHub Pages

Esta versión ejecuta CLIP en el navegador del visitante. No necesita FastAPI,
Python, Docker, claves API ni una computadora encendida como servidor.

## Actualizar el repositorio existente

1. Extrae el ZIP de actualización.
2. Copia su contenido en la raíz del repositorio Barniture, conservando las
   carpetas. Acepta reemplazar static/app.js. No borres catalogo/.
3. Sube los cambios a la rama main.
4. GitHub → Settings → Pages → Build and deployment.
5. Source: Deploy from a branch. Branch: main. Folder: / (root). Save.
6. Espera a que GitHub indique que el sitio está publicado y abre su enlace.

Los archivos Python y Docker originales pueden permanecer: Pages no los ejecuta.
La portada utilizada por Pages es index.html en la raíz, no static/index.html.

## Qué incluye la actualización

- index.html: portada con rutas relativas para /Barniture/.
- static/app.js: conserva selección, recorte, zoom, galería y ampliación.
- static/worker.js: carga el modelo y ejecuta la búsqueda en un Web Worker.
- indice-web.json: 43 vectores recalculados, normalizados y nombres de archivo.
- .nojekyll: publicación estática sin Jekyll.

Mantén static/styles.css y catalogo/ del repositorio original.

## Modelo y dependencias

Transformers.js 3.8.1, servido por jsDelivr.
Xenova/clip-vit-base-patch32, pesos ONNX q8 de visión.
Revisión fija: 6b7c523703ae26e39be4b03774966f8571c7f523.
El índice se generó con esos mismos pesos y procesador mediante Transformers.js
3.8.1 en Node. En navegador se usa WASM: puede haber pequeñas diferencias numéricas.
Los vectores antiguos de indice_barniture.npz no se usan en esta versión.

El modelo de visión ocupa 89,117,001 bytes (~89 MB), además de la biblioteca y
el runtime WASM. La primera búsqueda requiere internet para descargar los archivos.
La biblioteca utiliza caché del navegador cuando está disponible; el navegador
puede borrarla. No se realizan llamadas de inferencia a una API de pago.
Las fotos seleccionadas se procesan localmente, sin enviarlas a un servidor.
Requiere navegador moderno con WebAssembly, módulos y OffscreenCanvas.
El rendimiento y memoria disponibles dependen del dispositivo.
Los servicios de distribución y GitHub Pages conservan sus límites de uso.

## Verificación realizada

- Se generaron 43 vectores del catálogo real.
- Se probaron consultas independientes para barniture_02.jpg,
  barniture_07.jpg y barniture_08.jpg con el modelo q8: cada foto quedó primera
  y se obtuvieron 43 resultados ordenados.
- Se comprobó sintaxis JavaScript y referencias locales.
- La prueba visual de navegador no pudo ejecutarse: Chromium está bloqueado
  por el entorno del asistente. Falta validar el flujo completo en Pages,
  especialmente descarga, caché, recorte y rendimiento móvil.

## Prueba al publicar

Selecciona una foto, ajusta el recorte y pulsa Buscar. Espera la descarga inicial.
Comprueba que se muestran 43 resultados y que se puede ampliar una foto.
Si falla, revisa la consola del navegador y el mensaje de estado.
Si aparece la versión antigua, recarga con Ctrl+Shift+R.
No abras el HTML con file://: los módulos y workers necesitan HTTP/HTTPS.

Propuesta independiente de Javier; no es el sitio oficial de Barniture.
Las fotografías pertenecen a sus respectivos titulares.
