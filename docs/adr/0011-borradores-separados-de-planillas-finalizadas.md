# ADR 0011 · Borradores separados de las planillas finalizadas

Estado: Aceptada · 22 de octubre de 2026

## Contexto

El encargado necesita interrumpir la elaboración de una planilla y continuar después sin perder sus datos. El guardado final exige información completa y confirmación de revisión, por lo que utilizarlo para un avance incompleto mezclaría registros en elaboración con planillas finalizadas.

## Decisión

El borrador utiliza un flujo y validaciones distintos del guardado final. Requiere una plantilla, permite campos pendientes y valida el formato de los valores presentes. Su contenido se recopila y recupera mediante `borradores.js`, utilizando las funciones de los componentes para restaurar sus detalles.

La integración debe conservarlo en la base de datos con propietario y estado, mediante operaciones de API que comprueben el acceso. Al finalizar se exigen todas las validaciones, se recalcula la planilla y se conserva el vínculo con el borrador, impidiendo finalizarlo dos veces. En el ZIP están las funciones de recopilación y recuperación; el almacenamiento, los endpoints y la conexión con la interfaz siguen pendientes.

## Consecuencias

+ Se conserva un avance sin presentarlo como una planilla finalizada.
+ Las validaciones parciales no debilitan las exigencias del guardado definitivo.
- Deben mantenerse las operaciones de borrador y su transición al registro final.
- Los cambios en los campos del formulario deben reflejarse en el formato del borrador.
- La recuperación necesita coordinar los componentes y gestionar errores sin confundirlos con un guardado exitoso.
