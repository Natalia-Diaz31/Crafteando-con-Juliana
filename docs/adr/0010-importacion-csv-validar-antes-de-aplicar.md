# ADR 0010 · Importación CSV con validación previa a su aplicación

Estado: Aceptada · 22 de octubre de 2026

## Contexto

La importación incorpora ingresos y descuentos manuales a una planilla que puede contener datos escritos por el encargado. Un archivo puede tener errores de estructura, corresponder a otro empleado o contener importes inválidos. Aplicar cada fila mientras se lee podría sustituir solo una parte del detalle y dejar el formulario en un estado incompleto.

## Decisión

La importación separa lectura, validación y aplicación. `importacion-csv.js` comprueba UTF-8, extensión, tamaño, encabezados y estructura, y entrega filas o errores con su ubicación, sin modificar la planilla.

La integración debe enviar las filas a la API para validar empleado, período y reglas de los conceptos e importes. Antes de aplicar se presenta una vista previa; si existen errores se conservan los detalles actuales. Solo después de validar todo el archivo y confirmar la sustitución se reemplazan los detalles de ingresos y descuentos. Esta sustitución en el formulario no constituye un guardado en la base de datos. En el ZIP está implementada la lectura; la integración restante está pendiente.

## Consecuencias

+ Los errores de lectura no modifican los datos del encargado.
+ La estructura del CSV se procesa sin depender de la presentación de la pantalla.
- La importación requiere coordinación entre lector, API y componentes del formulario.
- Deben mantenerse los encabezados acordados y conservarse las filas originales para identificar errores.
