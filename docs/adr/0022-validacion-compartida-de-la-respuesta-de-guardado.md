# ADR 0022 · Validación compartida de la respuesta antes de confirmar el guardado

Estado: Aceptada · 1 de noviembre de 2026

## Contexto

La HU-32 requiere confirmar una planilla únicamente cuando la respuesta contiene un identificador válido. El guardado normal y la finalización de borradores deben aplicar el mismo control. El ADR 0004 regula los estados del botón y el ADR 0009 los reintentos, pero ninguno define la comprobación de la respuesta exitosa.

## Decisión

`js/resultado-guardado.js` expone `validarResultadoGuardado(resultado)`. Exige `ok: true` y un identificador de texto con el formato UUID admitido por su expresión regular. Si la respuesta no cumple ese contrato, lanza un error; si lo cumple, devuelve el mismo resultado.

`guardado-planilla.js` y `borradores-api.js` reutilizan esta función antes de continuar con la confirmación. La función no cambia botones, consulta registros ni implementa otro mecanismo de persistencia o reintento.

## Consecuencias

+ Ambos flujos comprueban la respuesta con el mismo criterio.
+ Una respuesta incompleta no se presenta como un guardado confirmado.
- Un error al validar la respuesta no demuestra que la operación no se haya guardado en el servidor.
- Los cambios del contrato de identificadores requieren adaptar el validador.
- Los reintentos continúan dependiendo de la protección de operación definida en el ADR 0009.
