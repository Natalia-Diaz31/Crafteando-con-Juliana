# Guía para instalar y verificar el pipeline de planillas

## Qué se corrigió

El ZIP original solo comprobaba la sintaxis y omitía las pruebas cuando package.json tenía el mensaje «no test specified». Podía terminar en verde sin ejecutar pruebas. La versión corregida ejecuta 23 pruebas obligatorias sobre las rutas reales de api_/server.js.

El workflow se ejecuta en cada push de cualquier rama, en los pull requests y mediante ejecución manual. Instala las dependencias con npm ci, comprueba la sintaxis de la API y ejecuta los casos con el runner de pruebas de Node.js. Usa Node.js 24, caché de npm y un límite de cinco minutos por trabajo. El tiempo real depende de GitHub y la descarga de dependencias; no se garantiza que siempre termine en menos de cinco minutos.

## Qué contiene el paquete

- .github/workflows/ci.yml: configuración que GitHub ejecuta.
- ci-tests/api.test.cjs: pruebas automatizadas del backend.
- docs/Guia_pipeline_GitHub.md: esta guía.

No basta subir el archivo ZIP: GitHub necesita los archivos extraídos en esas rutas, desde la raíz del repositorio. La carpeta .github debe llevar el punto inicial. No se coloca dentro de api_. No crear un repositorio nuevo.

## 1 Descargar y extraer

1. Descargar el ZIP corregido y extraerlo desde el Explorador de archivos de Windows.
2. Abrir la carpeta del repositorio Crafteando-con-Juliana que utilizas en Visual Studio Code.
3. Desde la terminal de esa carpeta, ejecutar `git status`. Si hay cambios propios, guardarlos en un commit antes de traer cambios del equipo.
4. Con la copia local limpia, confirmar que estás en la rama principal y actualizarla:

```powershell
git switch main
git pull --ff-only origin main
```

Si el comando falla porque hay cambios locales, ramas divergentes o conflictos, resolver ese estado antes de continuar. No usar --force ni borrar archivos para solucionar el rechazo.

5. Copiar las carpetas .github, ci-tests y docs del ZIP a la raíz del proyecto. Si ya existen, combinar su contenido. Reemplazar únicamente .github/workflows/ci.yml si es el pipeline que se está corrigiendo; conservar los otros workflows y documentos del equipo. Si api.test.cjs ya existe, revisar su contenido antes de reemplazarlo.
6. Comprobar que junto a api_ estén .github, ci-tests y docs. Dentro de .github debe estar workflows, y dentro de workflows, ci.yml.

La ruta final es `.github/workflows/ci.yml`, no `pipeline_github_actions/.github/workflows/ci.yml`, `api_/.github/workflows/ci.yml` ni `ci.yml.txt`.

## 2 Comprobar los requisitos del proyecto

La carpeta api_ debe conservar server.js, package.json, package-lock.json y utils/respuestas.js. Las dependencias del backend deben estar declaradas en package.json. Las pruebas utilizan express y jsonwebtoken ya presentes en el proyecto.

Instalar Node.js 24 para reproducir la versión del workflow. Comprobarla:

```powershell
node --version
npm --version
```

Las pruebas no necesitan instalar Jest o Supertest. No es necesario modificar package.json ni package-lock.json para incluirlas. El script npm test del package.json disponible todavía es un marcador «no test specified»; este workflow ejecuta directamente el runner de Node para que ese marcador no permita omitir pruebas.

## 3 Ejecutar las pruebas antes de subir

Desde la raíz del proyecto:

```powershell
cd api_
npm ci
node --check server.js
node --test --test-reporter=spec ../ci-tests/api.test.cjs
cd ..
```

Resultado esperado: 23 pruebas, 23 aprobadas, 0 fallidas y 0 omitidas. No ejecutar npm start para estas pruebas. Cada caso abre temporalmente un puerto local libre y lo cierra al finalizar; no requiere el puerto 3000.

Las pruebas cargan el código real de server.js, usan Express y JWT reales y sustituyen únicamente la conexión a Supabase y la carga de dotenv. No leen tu .env, no necesitan claves privadas y no escriben registros en la base de datos del equipo.

## 4 Qué se prueba

1. Respuesta de /health.
2. Login válido con emisión de un token verificable.
3. Login incorrecto sin token.
4. Guardado sin sesión.
5. Guardado con token inválido.
6. Guardado con token expirado.
7. Salario negativo.
8. Montos con tres decimales.
9. Letras en un monto.
10. Monto vacío.
11. Descuentos mayores que los ingresos.
12. Mes cero.
13. Mes trece.
14. Año vacío.
15. Empleado sin seleccionar.
16. Plantilla sin seleccionar.
17. Monto superior al límite NUMERIC(12,2).
18. Guardado válido con total 525.00, fecha, identificador y copia de los datos del empleado y de la plantilla. También comprueba que un total o un nombre enviado por el cliente no sustituya el cálculo y los datos del servidor.
19. Montos cero y mes doce.
20. Empleado inexistente.
21. Plantilla inexistente.
22. Error simulado de inserción en Supabase sin confirmación de éxito.
23. Respuesta de guardado sin identificador, sin confirmación de éxito.

Estas pruebas verifican el comportamiento del backend con respuestas controladas de Supabase. No prueban las políticas RLS reales, la función SQL real verificar_login, el despliegue en Vercel, las pantallas, las rutas de consulta ni la persistencia después de reabrir el sitio. Esas comprobaciones se mantienen como pruebas de integración y pruebas manuales del equipo.

## 5 Subir el pipeline

Desde la raíz del repositorio:

```powershell
git status
git add -- .github/workflows/ci.yml ci-tests/api.test.cjs docs/Guia_pipeline_GitHub.md
git diff --cached --stat
git diff --cached
git commit -m "Agrega pipeline con pruebas obligatorias de la API"
git push origin main
```

Revisar que git diff --cached solo contenga los archivos previstos. No subir .env, node_modules ni claves de Supabase. Si el repositorio exige pull requests o no tienes permiso de enviar a main, crear una rama `ci-planillas`, hacer el commit allí, subir con `git push -u origin ci-planillas` y abrir un pull request a main. Integrarlo después de revisar el resultado del pipeline.

Si git push es rechazado porque otro integrante subió cambios, no forzar el envío. Integrar primero el trabajo nuevo y volver a ejecutar las pruebas.

## 6 Ver la ejecución en GitHub

1. Abrir el repositorio en GitHub.
2. Entrar en Actions.
3. Abrir «CI - API de planillas» y la ejecución correspondiente al commit que acabas de subir.
4. Abrir el trabajo «Validar API y ejecutar pruebas».
5. Revisar los pasos de instalación, sintaxis y pruebas. El último debe mostrar los casos ejecutados y cero fallos.
6. Capturar la ejecución en verde junto al nombre del workflow y el commit. No basta la captura de Vercel ni una salida local de PowerShell.
7. Copiar el enlace al archivo .github/workflows/ci.yml del repositorio y el enlace a la ejecución aprobada.

Si no aparece el workflow, revisar su ruta y confirmar que los archivos se subieron a GitHub. Si Actions está deshabilitado, pedir a la persona administradora que lo habilite según la configuración del repositorio. Para ejecutarlo manualmente después de estar en la rama principal: Actions > CI - API de planillas > Run workflow > seleccionar la rama > Run workflow.

## 7 Demostrar que una prueba rota pone el pipeline en rojo

Coordinar esta demostración con el equipo. Hacerla en una rama para conservar main funcional:

```powershell
git switch -c demostracion-ci-rojo
```

1. Abrir ci-tests/api.test.cjs.
2. Buscar esta línea dentro de la prueba del guardado válido:

```javascript
assert.equal(Number(r.body.total_pagar), 525);
```

3. Cambiar únicamente el valor esperado de 525 a 526:

```javascript
assert.equal(Number(r.body.total_pagar), 526);
```

4. Guardar y subir:

```powershell
git add -- ci-tests/api.test.cjs
git commit -m "Demuestra fallo intencional de una prueba"
git push -u origin demostracion-ci-rojo
```

5. En Actions, abrir la ejecución de esa rama. Debe quedar en rojo, con el error 525 !== 526 en la prueba del guardado. Guardar la captura y el enlace. No integrar ese commit a main.
6. Restaurar la línea a 525, guardar y subir:

```powershell
git add -- ci-tests/api.test.cjs
git commit -m "Restaura el valor esperado de la prueba"
git push
```

7. Confirmar la nueva ejecución en verde. Al terminar, regresar a main con `git switch main`. La rama de demostración no necesita integrarse.

## 8 Revisar antes de integrar

El equipo revisa el trabajo «Validar API y ejecutar pruebas» en el pull request antes de aceptar cambios. Para impedir merges con pruebas fallidas, la persona administradora puede configurar una regla de protección de main que requiera el resultado satisfactorio de ese check, si la modalidad del repositorio lo permite. El YAML por sí solo ejecuta pruebas; no bloquea todos los merges o envíos directos.

## 9 Qué hacer si queda en rojo

- npm ci falla: revisar que api_/package-lock.json exista y coincida con package.json. Si se cambiaron dependencias, actualizar el lockfile localmente con npm install, revisar ambos archivos y subirlos juntos. No sustituir automáticamente npm ci por npm install para ocultar el problema.
- Cannot find module: revisar la dependencia declarada en package.json o la ruta api_/utils/respuestas.js. El workflow instala solo lo declarado en el proyecto.
- Unexpected end of input: hay un error de sintaxis real en server.js. La copia anterior compartida tenía una llave faltante antes de `if (Object.keys(errores).length > 0)`. Comprobar que la corrección realizada durante el desarrollo esté en la versión de GitHub.
- Una prueba devuelve 404 en lugar de 201: confirmar que existe POST /api/planillas y que se copió el código de HU-08 en el backend actual.
- Error de assertion: leer el nombre de la prueba, el resultado esperado y el recibido. Corregir la implementación si incumple el criterio; no quitar la prueba solo para conseguir verde.
- El trabajo excede cinco minutos: revisar en qué paso se detuvo. No aumentar el límite sin identificar la causa.
- No hay pruebas: no eliminar ni renombrar ci-tests/api.test.cjs sin actualizar el workflow. Su ausencia produce error para impedir un verde vacío.

## 10 Evidencia y alcance de la verificación

El paquete se comprobó localmente con Node.js 24 y las dependencias de la API disponibles. Se usó el último server.js compartido en esta conversación con la llave faltante previamente identificada corregida en una copia temporal. El paquete no reemplaza el backend del equipo.

Resultado local: 23 casos aprobados. Al cambiar el total esperado a 526, 22 casos aprobaron y 1 falló; el proceso terminó con código 1. El archivo entregado conserva 525, por lo que la prueba intencionalmente rota no queda en el paquete.

La versión actual completa de GitHub no viene dentro del ZIP recibido y no se ejecutó Actions desde aquí. Por eso se debe confirmar la compatibilidad final ejecutando los pasos 3 y 6 en el repositorio actual. Si otros integrantes cambiaron las rutas o el formato de respuesta, revisar esos cambios frente a los criterios antes de adaptar las pruebas.

Entregar a la docente la captura del pipeline en verde y el enlace al repositorio con ci.yml. Conservar además las evidencias del fallo intencional y de la restauración. Para declarar terminado el taller, comprobar que se ejecuta en los cambios nuevos, que muestra pruebas reales y que el equipo revisa el resultado antes de integrar.

Referencias técnicas: https://github.com/actions/setup-node y https://nodejs.org/api/test.html
