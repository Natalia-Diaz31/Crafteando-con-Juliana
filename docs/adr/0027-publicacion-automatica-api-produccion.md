# ADR 0027 - Publicación automática de la API en producción

Estado: Aceptada - 19 de octubre del 2026

## Contexto

Aunque GitHub Actions ya permitía generar despliegues de la API en Vercel, estos no se reflejaban automáticamente en producción. Era necesario publicarlos manualmente, lo que podía provocar que la aplicación utilizara versiones desactualizadas.

## Decisión

Se decidió incorporar el comando `vercel deploy --prebuilt --prod` al workflow para publicar automáticamente en producción los cambios de la API que superen las verificaciones previas.

## Consecuencias

+ Se mantiene la API actualizada sin intervención manual.
+ Se reducen los retrasos entre los cambios de GitHub y su publicación.
- Los errores no detectados por las pruebas pueden llegar a producción.
- Una configuración incorrecta del despliegue puede afectar el funcionamiento del sistema.
