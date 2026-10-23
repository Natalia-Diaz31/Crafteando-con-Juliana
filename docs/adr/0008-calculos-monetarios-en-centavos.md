# ADR 0008 · Cálculos monetarios en centavos y redondeo definido

Estado: Aceptada · 22 de octubre de 2026

## Contexto

La planilla calcula deducciones y salarios proporcionales a partir de importes con dos decimales. Operar directamente con números decimales de JavaScript puede producir diferencias de precisión. Además, repartir un salario entre 30 días y aplicar porcentajes puede generar fracciones de centavo que deben resolverse de la misma forma en el navegador y en la API.

## Decisión

El motor representa los importes como centavos enteros, valida su formato antes de convertirlos y utiliza `BigInt` en las multiplicaciones y divisiones que requieren redondeo. Cada deducción y el salario proporcional se redondean al centavo más cercano; una mitad de centavo se redondea hacia arriba.

Los resultados se entregan como cadenas con dos decimales. El cálculo por días se incorpora al motor existente, conservando la función anterior para los flujos que todavía la utilizan. La API recalcula las deducciones en lugar de confiar en el resultado del navegador. La duplicación temporal de este motor sigue regulada por el ADR 0006.

## Consecuencias

+ Los cálculos tienen una unidad monetaria y un redondeo definidos.
+ El salario proporcional y las deducciones reutilizan las mismas conversiones y validaciones.
- Los componentes deben distinguir entre centavos internos e importes expresados en dólares.
- `BigInt` debe convertirse antes de enviar resultados mediante JSON.
- Mantener el motor disponible no completa su conexión con el formulario por días.
