# ADR 0018 · Duplicación mediante una transformación al formato existente del formulario

Estado: Aceptada · 1 de noviembre de 2026

## Contexto

La HU-27 necesita iniciar otra planilla con datos reutilizables sin copiar el estado de guardado, la confirmación ni los identificadores de la operación anterior. El ADR 0011 define la recuperación de borradores, pero no cómo reutilizarla para una duplicación.

## Decisión

`js/duplicacion-planilla.js` expone `prepararDuplicacion(datos, motor)` para transformar la respuesta de duplicación al formato de contenido que ya recupera el formulario. La función recibe los datos y el motor monetario; no realiza solicitudes ni manipula el DOM. Reutiliza `normalizarIngresos()` y devuelve una estructura con `version_formato: 1`.

Se conservan las referencias de empleado y plantilla, el salario proporcionado por el servicio y los detalles reutilizables recibidos. Mes, año, horas, motivo de ajuste y observaciones se reinician; las novedades quedan vacías y la frecuencia se inicia como mensual. No se incorporan identificadores de planilla, borrador u operación. La integración de `duplicacion-formulario.js` utiliza `recuperarBorrador()` en lugar de construir otro mecanismo de recuperación.

## Consecuencias

+ La transformación puede comprobarse sin ejecutar una consulta ni reproducir toda la pantalla.
+ La duplicación reutiliza la recuperación existente y no reproduce sus reglas.
- La transformación depende del contrato de respuesta del servicio y del formato aceptado por la recuperación.
- Solo puede reutilizar los movimientos que entregue el servicio.
- El nuevo período debe completarse y la planilla debe revisarse antes del guardado.
