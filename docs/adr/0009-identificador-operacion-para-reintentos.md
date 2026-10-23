# ADR 0009 · Identificador de operación para los reintentos de guardado

Estado: Aceptada · 22 de octubre de 2026

## Contexto

Una solicitud puede guardar la planilla y perder su respuesta por un problema de conexión. Reintentar en esa situación puede crear un duplicado, aunque el botón se haya bloqueado durante la primera solicitud. El ADR 0004 cubre los estados del botón, pero ese bloqueo no permite reconocer una operación que ya fue procesada por el servidor.

## Decisión

Cada operación de guardado utiliza un UUID generado en el navegador y enviado como `operacion_id`. Se conserva durante los reintentos con los mismos datos y se renueva cuando cambia el contenido de una operación fallida o se inicia una nueva planilla.

La API y la base de datos deben reconocer ese identificador mediante una restricción de unicidad y devolver el registro existente cuando se repita. La restricción corresponde a la operación, no a la combinación de empleado y período. En el ZIP revisado está implementada la parte del navegador; la protección completa depende de integrar la API y SQL. El identificador actual se conserva en memoria, sin garantizar su continuidad después de recargar la página.

## Consecuencias

+ Permite distinguir un reintento de una nueva operación.
+ Complementa el bloqueo visual del botón frente a respuestas perdidas.
- Requiere coordinar el mismo identificador entre navegador, API y base de datos.
- Sin la integración pendiente, todavía pueden generarse duplicados en el servidor.
