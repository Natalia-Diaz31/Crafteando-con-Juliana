# ADR 0020 · Observaciones con normalización y validación reutilizadas en el formulario

Estado: Aceptada · 1 de noviembre de 2026

## Contexto

La HU-29 permite una observación opcional de hasta 500 caracteres después de retirar espacios exteriores. El contador, la revisión y los guardados necesitan aplicar el mismo criterio sin mantener varias validaciones del navegador. El mecanismo de eventos del ADR 0007 ya permite invalidar el resumen.

## Decisión

`js/observaciones.js` concentra `normalizarObservacion()` y `validarObservacionesFormulario()`. La primera aplica `trim()` y devuelve el texto y su error; la segunda reutiliza ese resultado para actualizar contador, mensaje y estado de accesibilidad del campo. Al salir del control se retiran los espacios exteriores.

El mismo validador se importa desde el coordinador de revisión, la captura de borradores y el guardado final. El módulo escucha `input` y el evento existente `planilla:modificada` para actualizar la presentación, incluida la recuperación de datos. Los eventos del formulario continúan invalidando el resumen mediante el mecanismo ya implementado. Se conserva la validación independiente de la API: la comprobación del navegador no sustituye el control del servidor. La observación permanece separada del motivo del ajuste salarial.

## Consecuencias

+ Contador, revisión y guardados reutilizan una sola validación del navegador.
+ No se crea otro flujo de borradores ni otra función para ocultar el resumen.
- El módulo depende de los identificadores del campo, contador y mensaje definidos en el HTML.
- La regla debe mantenerse coherente con la validación de la API.
- La longitud se cuenta mediante `String.length`, que mide unidades UTF-16; algunos símbolos ocupan más de una unidad.
