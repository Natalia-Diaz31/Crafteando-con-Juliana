# ADR 0023 · Validación de salario e ingresos extraída en la API

Estado: Aceptada · 1 de noviembre de 2026

## Contexto

La HU-33 necesita separar la validación de salario e ingresos del procesamiento general de planillas. Mantener estas reglas dentro del flujo HTTP dificulta reutilizarlas y comprobarlas sin ejecutar toda la ruta. Esta extracción no modifica la decisión del ADR 0006 sobre las dos copias del motor monetario.

## Decisión

`api_/utils/validar-ingresos.js` concentra `validarSalarioEIngresos(datos)`, que reutiliza el motor de nómina del servidor. Valida el salario según el modo de cálculo, admite el total de ingresos anterior cuando no se recibe detalle y, cuando existe detalle, valida sus registros y calcula su suma.

Devuelve salario e ingresos en centavos, detalle normalizado y errores asociados a campos. `api_/utils/validar-planilla-definitiva.js` consume ese resultado para la validación definitiva. El componente no escribe en la base de datos ni construye respuestas HTTP; esas responsabilidades permanecen en los flujos existentes.

## Consecuencias

+ Las reglas de salario e ingresos quedan agrupadas y pueden probarse de manera aislada.
+ Se conserva la compatibilidad con solicitudes que todavía envían ingresos sin desglose.
- Los consumidores deben interpretar los importes devueltos como centavos y conservar el manejo de errores.
- El módulo mantiene dependencia del motor monetario del servidor y de los tipos y orígenes de ingreso admitidos.
