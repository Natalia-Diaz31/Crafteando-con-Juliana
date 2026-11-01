# ADR 0021 · Exportación con generadores separados y bibliotecas recibidas como dependencias

Estado: Aceptada · 1 de noviembre de 2026

## Contexto

Las HU-30 y HU-31 requieren producir PDF y Excel a partir de datos de planillas. Incorporar consultas, cálculos de nómina y construcción de archivos en una sola función repetiría responsabilidades de los preparadores y de la pantalla de detalle. Los ADR existentes no definen la generación de estos formatos.

## Decisión

`js/exportacion-pdf.js` recibe datos generales, secciones de movimientos y las dependencias `jsPDF` y `autoTable`; devuelve un documento sin iniciar su descarga. Utiliza tablas con encabezados repetidos entre páginas y evita dividir filas cuando la biblioteca puede conservarlas completas.

`js/exportacion-excel.js` recibe los datos generales y `XLSX`; crea el libro y la hoja «Resumen», y devuelve el libro para que la integración agregue las demás hojas. Los importes y días se almacenan como celdas numéricas; identificadores y observaciones se almacenan explícitamente como texto.

Los generadores reutilizan datos preparados y no consultan la API ni recalculan la nómina. La integración controla bibliotecas, errores, nombre de archivo y descarga. En el ZIP revisado el PDF está conectado desde `detalle-planilla.js`; el generador Excel existe, pero no se encontró una llamada a `crearLibroPlanilla()` desde el flujo de descarga. Esta decisión no afirma que esa conexión esté terminada.

## Consecuencias

+ La construcción de cada formato queda separada de la consulta y de los botones.
+ Excel conserva ceros iniciales de identificadores y tipos numéricos para los importes del resumen.
+ Las dependencias pueden proporcionarse al generador sin consultar variables globales dentro de él.
- La integración debe proporcionar bibliotecas y estructuras compatibles.
- Las otras hojas de Excel deben agregarse al mismo libro antes de descargarlo.
- Los cambios en el formato de datos preparado requieren revisar ambos generadores.
