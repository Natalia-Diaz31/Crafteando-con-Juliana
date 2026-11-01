# ADR 0024 · Totales compartidos entre formulario y revisión

Estado: Aceptada · 1 de noviembre de 2026

## Contexto

La HU-34 requiere que el total visible del formulario y el resumen utilicen el mismo cálculo. Mantener sumas y restas en ambos archivos puede producir resultados distintos. El ADR 0008 define la representación monetaria, pero no la función compartida que reúne estos subtotales.

## Decisión

`js/totales-planilla.js` expone `calcularTotales()` y recibe salario, ingresos adicionales, deducciones legales y descuentos manuales como centavos enteros. Valida entradas no negativas, enteros seguros y el máximo admitido; rechaza sumas fuera de rango y descuentos superiores a los ingresos. Devuelve total de ingresos, total de descuentos y total a pagar.

`planilla-total.js` y `revision-planilla.js` utilizan la misma función. La preparación de las entradas y la separación de descuentos permanecen en sus componentes; la función no calcula ISSS, AFP o renta, no lee el DOM y no modifica el motor monetario. La API conserva su validación y cálculo independientes.

## Consecuencias

+ Formulario y revisión comparten una sola fórmula para los tres totales.
+ Las deducciones legales y los descuentos manuales se reciben por separado para evitar sumarlos dos veces.
- Los consumidores deben preparar correctamente los subtotales y convertirlos a centavos.
- La coincidencia del cálculo del navegador no sustituye la comprobación del servidor.
- Los errores de la función deben presentarse desde los componentes que la utilizan.
