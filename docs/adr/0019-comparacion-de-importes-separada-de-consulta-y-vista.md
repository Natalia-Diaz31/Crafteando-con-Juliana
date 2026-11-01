# ADR 0019 · Comparación de importes separada de la consulta y la presentación

Estado: Aceptada · 1 de noviembre de 2026

## Contexto

La HU-28 presenta diferencias entre la planilla actual y una anterior. Mezclar la consulta histórica, las restas y el renderizado dificultaría comprobar el cálculo. El ADR 0008 ya establece operar en centavos; esta decisión define dónde se realiza la comparación.

## Decisión

`js/comparacion-planillas.js` expone `compararImportes(actuales, anteriores, motor)`. Compara total de ingresos, deducciones legales, descuentos manuales y total a pagar utilizando las conversiones del motor recibido. Devuelve importes, diferencia en centavos, texto con signo y estado de aumento, disminución o ausencia de cambio.

La función no consulta la API, modifica los registros ni lee elementos del formulario. `revision-planilla.js` conserva la consulta de la planilla anterior y la presentación de los resultados. No se implementa otro motor de redondeo ni se recalculan importes históricos dentro del comparador.

## Consecuencias

+ La misma entrada produce resultados comprobables sin depender del navegador o la API.
+ La presentación utiliza un resultado definido sin repetir las restas ni la asignación del estado.
- Los consumidores deben proporcionar los cuatro importes con los nombres y formatos esperados.
- Los errores de conversión deben gestionarse desde el flujo que utiliza la comparación.
