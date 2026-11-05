# ADR 0029 - Finalización del borrador desde el botón de guardado

Estado: Aceptada - 26 de octubre del 2026

## Contexto

Para la HU-23, el encargado podía abrir un borrador y terminarlo en el mismo formulario de la planilla. Si al guardar se creaba una planilla nueva, el borrador quedaba abierto y la misma planilla podía terminar registrada dos veces.

## Decisión

Se decidió que, cuando haya un borrador abierto, el botón «Guardar planilla» guarde los últimos cambios del borrador y lo convierta en la planilla final. Se descartó agregar un botón «Finalizar borrador», porque el encargado tendría dos botones para la misma acción y podría utilizar el equivocado.

## Consecuencias

+ El encargado utiliza un solo botón para guardar una planilla nueva o terminar un borrador.
+ Cada borrador queda vinculado con la planilla que se generó a partir de él.
- La API mantiene dos formas de guardar planillas, y un cambio en una puede olvidarse en la otra.
- Si la conexión falla al finalizar, el borrador queda guardado pero sin convertirse en planilla.
