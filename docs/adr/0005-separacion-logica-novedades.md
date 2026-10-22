# ADR 0005 - Separación de la lógica de novedades

Estado: Aceptada · 21 de octubre de 2026

## Contexto

La HU-18 agrega el registro de novedades del empleado, con acciones para agregar, editar y eliminar registros, además de mostrar los días de cada novedad y el total de días remunerados. Esta lógica podría agregarse directamente a planilla.js, pero ese archivo ya contiene otras funciones relacionadas con la creación de la planilla y seguir agregando responsabilidades haría que distintas funcionalidades dependan más entre sí.

## Decisión

Mantendremos la lógica de las novedades en un archivo separado llamado novedades.js. Descartamos agregar estas funciones directamente en planilla.js para mantener juntas las funciones que pertenecen a las novedades y evitar que cambios en esta funcionalidad afecten innecesariamente otras partes de la planilla.

## Consecuencias

+ La lógica para agregar, editar y eliminar novedades queda agrupada en un mismo archivo.
+ Los cambios en las novedades quedan más separados de otras funciones de la creación de planilla.
+ planilla.js no adquiere una nueva responsabilidad.
- Se agrega un nuevo archivo JavaScript que debe cargarse desde planilla.html.
- La funcionalidad depende de que los elementos de novedades definidos en planilla.html mantengan sus identificadores.