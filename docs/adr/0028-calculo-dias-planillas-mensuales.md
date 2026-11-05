# ADR 0028 - Cálculo por días solo en planillas mensuales

Estado: Aceptada - 24 de octubre del 2026

## Contexto

Para la HU-19, el salario mensual debía pagarse según los días trabajados, restando los permisos y ausencias sin goce. Las reglas para calcular los días ya existían, pero solo funcionaban con planillas mensuales, y el mismo formulario también se utilizaba para planillas quincenales y semanales.

## Decisión

Se decidió calcular por días únicamente las planillas mensuales, mientras que las quincenales y semanales conservan el salario completo, sin descontar días. Se descartó agregar al formulario una opción para elegir el tipo de cálculo, porque el encargado tendría que escoger algo que ya depende de la frecuencia de pago.

## Consecuencias

+ El encargado no necesita elegir cómo se calcula el salario.
+ Las planillas guardadas por horas se siguen mostrando de la misma forma.
- Las planillas quincenales y semanales no pueden registrar permisos ni ausencias.
- Si la API cambia la forma de recibir el tipo de cálculo, el formulario también debe actualizarse.
