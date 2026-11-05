# ADR 0030 - Manejo común de los errores de acceso a la API

Estado: Aceptada - 30 de octubre del 2026

## Contexto

Para la HU-32, el sistema debía distinguir cuándo la sesión expiró, cuándo el usuario no tiene permisos y cuándo falló el servidor. Cada pantalla mostraba estos errores de forma distinta y, cuando la sesión expiraba, aparecía un error de guardado sin llevar al usuario al inicio de sesión. Además, varias pantallas utilizan archivos que no pueden importar módulos, por lo que no era posible compartir la revisión mediante `import`.

## Decisión

Se decidió crear una sola función, `verificarAccesoApi()`, dentro de `sesion.js`, que ya se carga en todas las páginas que requieren sesión, para revisar la respuesta de la API en la creación, consulta y detalle de planillas. Se descartó revisar estos errores por separado en cada pantalla, porque los mensajes volverían a ser distintos y cada cambio tendría que repetirse varias veces.

## Consecuencias

+ Las pantallas de planillas muestran los mismos mensajes para los mismos errores.
+ Cuando la sesión expira, el usuario regresa automáticamente al inicio de sesión.
- Cada pantalla nueva debe utilizar la función para manejar correctamente los errores.
- Se utiliza una función global, a diferencia de los módulos que propone el ADR 0007.
