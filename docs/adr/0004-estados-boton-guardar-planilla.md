# ADR 0004 Manejo de estados del botón Guardar planilla
Estado: Aceptada  20 de octubre de 2026
## Contexto
El guardado de la planilla ya se realiza desde guardado-planilla.js y el botón “Guardar planilla” depende de la confirmación realizada durante la revisión. Para la HU-17 necesitamos que, mientras se guarda una planilla, el botón muestre “Guardando…” y no permita volver a presionarlo. También necesitamos que, si el guardado es exitoso, el botón cambie a “Planilla guardada” y permanezca deshabilitado.
## Decisión
Mantendremos el manejo de los estados del botón dentro de guardado-planilla.js, reutilizando el flujo de guardado existente. Descartamos crear otro archivo solo para manejar estos estados porque separaríamos una parte que depende directamente del resultado del guardado.
## Consecuencias
+ El estado del botón permanece junto al flujo de guardado que lo modifica.
+ Evitamos que el usuario presione varias veces el botón mientras se está guardando la planilla.
- guardado-planilla.js asume también la responsabilidad de actualizar el estado visual del botón.
- Los estados del botón dependen de que el elemento btn-guardar-planilla siga disponible en la interfaz.

