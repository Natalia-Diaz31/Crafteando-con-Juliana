# ADR 0017 · Historial con estado en la URL e inicialización única

Estado: Aceptada · 1 de noviembre de 2026

## Contexto

Las HU-25 y HU-36 requieren consultar el historial por empleado y página sin perder la selección al recargar. Registrar varias veces la inicialización puede repetir consultas y eventos. La estructura general del frontend definida en el ADR 0002 no establece cómo conservar este estado ni controlar esa inicialización.

## Decisión

El listado conserva `empleado_id` y `pagina` en los parámetros de la URL. `js/consultar-planillas.js` valida la página, construye la consulta con esos parámetros y utiliza navegación normal para cambiar de página o quitar el filtro. Actualiza la URL con la página devuelta por la API mediante `history.replaceState`.

La inicialización se encapsula en una función privada y marca el elemento `main` con `data-consulta-inicializada` antes de consultar. Se ejecuta al terminar de cargar el documento o inmediatamente si ya está disponible. Se conserva el mapa existente de solicitudes activas que reutiliza consultas simultáneas idénticas; la marca de inicialización complementa ese mecanismo, sin crear otro servicio de consulta.

## Consecuencias

+ El filtro y la página pueden conservarse al recargar y navegar por el historial del navegador.
+ Una segunda carga accidental del script reconoce que la página ya fue inicializada.
- Cambiar de página recarga la pantalla y requiere volver a consultar la API.
- La marca evita repetir la inicialización; no constituye un mecanismo de reintento ante errores.
- La protección depende de conservar los identificadores de los controles y el contrato de paginación de la API.
