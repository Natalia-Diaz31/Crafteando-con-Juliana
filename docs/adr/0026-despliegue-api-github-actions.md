# ADR 0026 - Automatización del despliegue de la API mediante GitHub Actions

Estado: Aceptada - 19 de octubre del 2026

## Contexto

La API y el frontend estaban en proyectos de Vercel distintos. Debido a las limitaciones de acceso y vinculación del repositorio, los cambios de la API debían desplegarse manualmente desde VS Code. Esto generaba retrasos y diferencias entre el código de GitHub y la versión publicada.

## Decisión

Se decidió utilizar GitHub Actions y Vercel CLI para automatizar los despliegues de la API desde el repositorio, utilizando las credenciales del proyecto configuradas como secretos de GitHub.

## Consecuencias

+ Se reduce la dependencia de los despliegues manuales.
+ Se facilita mantener sincronizado el repositorio con Vercel.
- Se requiere administrar correctamente las credenciales y el workflow.
- Los errores de configuración pueden interrumpir los despliegues.
