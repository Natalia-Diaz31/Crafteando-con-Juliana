# ADR 0003 · Deducciones legales guardadas junto con los descuentos manuales

Estado: Aceptada · 16 de octubre de 2026

## Contexto

Cada planilla requiere aplicar deducciones legales y permite agregar descuentos por situaciones particulares, como llegadas tardías. El encargado necesita distinguir ambos tipos y consultar su efecto en el total a pagar. Ingresar las deducciones legales manualmente repetiría el trabajo en cada planilla y aumentaría el riesgo de errores, mientras que los descuentos particulares requieren un concepto y un importe definidos por el encargado.

## Decisión

El equipo mantiene las deducciones legales y los descuentos manuales en el mismo detalle guardado de la planilla, con sus conceptos e importes identificados, y los incluye una sola vez en el total de descuentos. Conservamos el cálculo automático de ISSS, AFP y renta y el ingreso manual de otros conceptos, en lugar de exigir la digitación de todas las deducciones.

## Consecuencias

+ El encargado consulta los importes legales calculados y agrega descuentos particulares sin calcular ni transcribir las deducciones legales.
+ Ambos tipos quedan asociados a la misma planilla y forman parte de su total de descuentos.
- Compartir el detalle exige distinguir los conceptos legales de los manuales y evitar contarlos dos veces.
- Los dos apartados de descuentos pueden confundir al usuario. Las consultas deben reconocer los distintos formatos históricos.
- Los descuentos por llegadas tardías siguen requiriendo un importe ingresado manualmente.

