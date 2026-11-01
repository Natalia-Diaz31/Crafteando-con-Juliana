# ADR 0025 · Coordinador de revisión con resultados asociados a campos

Estado: Aceptada · 1 de noviembre de 2026

## Contexto

La HU-35 necesita reunir los errores de los componentes antes de presentar la revisión. Encadenar validadores con operadores de cortocircuito impide ejecutar los siguientes cuando uno falla. El ADR 0007 establece módulos y eventos, pero no define el contrato que coordina los resultados de validación.

## Decisión

`js/validacion-revision.js` expone `validarRevision(validacionesAdicionales)`. Cada regla contiene `campo`, `mensaje` y una función síncrona `validar` que devuelve un booleano. El coordinador ejecuta todas las reglas disponibles y devuelve `{ valido, errores }`, sin copiar sus reglas de negocio.

Importa las validaciones de novedades, ingresos, ajuste salarial y observaciones. `revision-planilla.js` añade los validadores exportados de los demás componentes y conserva la presentación de errores, el foco y el flujo del resumen. Las comprobaciones adicionales que aún permanecen después del coordinador no se consideran extraídas por esta decisión. Se mantienen los eventos existentes de invalidación y la confirmación desmarcada al cambiar datos.

## Consecuencias

+ Un resultado inválido no impide ejecutar las demás reglas del coordinador.
+ Cada componente conserva sus reglas mientras la revisión consume un contrato común de errores.
+ Los validadores adicionales pueden incorporarse sin reescribir el bucle del coordinador.
- Las funciones deben devolver booleanos de forma síncrona; no se admiten promesas en este contrato.
- Una excepción lanzada por un validador interrumpe el recorrido; el coordinador no la convierte automáticamente en un error de campo.
- Los mensajes generales por componente no garantizan enumerar cada error interno de ese componente.
