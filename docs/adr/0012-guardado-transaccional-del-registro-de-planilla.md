# ADR 0012 · Guardado transaccional del registro de planilla

Estado: Aceptada · 22 de octubre de 2026

## Contexto

La planilla y sus descuentos se almacenan en registros relacionados. Si se guardaran mediante solicitudes independientes, un error podría dejar una planilla sin su detalle. Además, una consulta histórica debe mostrar los datos conservados al guardar, aunque posteriormente cambien el nombre o el cargo del empleado o el nombre de la plantilla.

## Decisión

La API envía el registro y su detalle a la función SQL `guardar_planilla_con_descuentos`, que inserta la planilla y los descuentos dentro de una misma transacción. Si una inserción falla, no debe quedar un guardado parcial.

El registro conserva los identificadores del empleado y de la plantilla junto con copias de sus datos descriptivos al momento del guardado. Las consultas utilizan esos valores guardados. La API obtiene los datos descriptivos del servidor, sin confiar en los enviados por el navegador. Esta decisión complementa el ADR 0003: aquel define qué descuentos comparten el detalle; este define la consistencia de su almacenamiento y consulta histórica. No implica que las nuevas tablas del Sprint 3 ya estén integradas en esa transacción.

## Consecuencias

+ El registro y sus descuentos se guardan juntos o se rechazan juntos.
+ Las consultas históricas conservan los datos descriptivos del momento del guardado.
- Se duplican algunos datos del empleado y la plantilla de forma intencional.
- Los nuevos detalles requieren adaptar la función SQL y su integración con la API.
