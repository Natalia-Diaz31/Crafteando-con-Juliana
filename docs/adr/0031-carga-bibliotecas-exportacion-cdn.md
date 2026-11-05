# ADR 0031 - Carga de las bibliotecas de exportación desde CDN

Estado: Aceptada - 2 de noviembre del 2026

## Contexto

Para las HU-30 y HU-31, el detalle de la planilla debía descargarse en PDF y en Excel, lo que requería bibliotecas externas. El proyecto no utiliza herramientas para empaquetar bibliotecas, y la versión de la biblioteca de Excel disponible en npm está desactualizada y presenta fallas de seguridad conocidas.

## Decisión

Se decidió cargar las bibliotecas de PDF y Excel desde CDN con versiones fijas, y descargar la de Excel solo cuando el usuario presiona «Descargar Excel». Se descartó copiar las bibliotecas dentro del repositorio, porque habría que actualizarlas manualmente y aumentaría el tamaño del proyecto.

## Consecuencias

+ El detalle de la planilla carga más rápido, porque la biblioteca de Excel solo se descarga cuando se necesita.
+ Las versiones fijas evitan que una actualización externa cambie el funcionamiento sin aviso.
- Si el CDN no está disponible, no se pueden descargar los archivos.
- A diferencia del PDF, el navegador no puede comprobar que la biblioteca de Excel no haya sido modificada.
