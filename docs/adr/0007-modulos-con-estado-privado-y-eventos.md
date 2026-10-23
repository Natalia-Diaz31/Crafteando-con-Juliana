# ADR 0007 · Módulos con estado privado y eventos para comunicar cambios

Estado: Aceptada · 22 de octubre de 2026

## Contexto

Los nuevos detalles de novedades e ingresos y el ajuste salarial necesitan conservar sus propios datos y comunicar cambios a la revisión y al guardado. Agregar más variables globales permitiría que otros archivos modificaran directamente esos datos y aumentaría las dependencias existentes. El ADR 0005 separó las novedades de `planilla.js`, pero no definió cómo intercambiar información entre componentes.

## Decisión

Los componentes nuevos mantienen su estado dentro de módulos JavaScript y exponen funciones mediante `export` e `import`. Los datos se consultan mediante funciones que devuelven copias o resultados normalizados. Los cambios notifican a la revisión mediante el evento `planilla:modificada`, sin que cada componente manipule directamente el resumen.

Las reglas de fechas permanecen en `novedades-reglas.js`, separadas de la interfaz de `novedades.js`. Se conservan las funciones globales anteriores que todavía utiliza el sistema; esta decisión aplica gradualmente y no implica que todo el frontend ya esté desacoplado.

## Consecuencias

+ Cada componente controla sus datos y agrupa las funciones de su responsabilidad.
+ Las reglas pueden verificarse sin reproducir toda la pantalla.
+ La revisión puede reaccionar a cambios sin conocer la implementación de cada detalle.
- Deben mantenerse los nombres de las funciones exportadas y de los eventos compartidos.
- Durante la transición conviven módulos y funciones globales; los primeros requieren cargarse con `type="module"`.
