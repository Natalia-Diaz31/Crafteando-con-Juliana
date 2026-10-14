# Evidencias de Victor · Sprint 2

Pruebas realizadas el 14/10/2026 en local (API en `localhost:3000` conectada a la base de datos real, sitio en `127.0.0.1:5500`).

---

## HU-09 · Acceso según rol (E6) — In Progress

**Hecho**
- `js/rol.js`: acuerdo del rol → valor `"Encargado de nómina"`, clave `"rol"` en `sessionStorage`, funciones `obtenerRol()` y `esEncargadoNomina()`.
- `js/login.js`: guarda el rol al iniciar sesión; si la cuenta no tiene rol, borra el anterior.
- `rol.js` cargado en las 5 páginas (después de `sesion.js` en las protegidas; antes de `login.js` en `index.html`).
- El rol en la respuesta del login y en el token ya está en `main` (`usuario.rol`, hecho por Natalia).
- Base de datos (Sara): la tabla `cuentas` tiene `rol`; la cuenta de demostración tiene «Encargado de nómina» y la de prueba «Sin permisos».

**Pendiente**
- Confirmar que `verificar_login` devuelve `rol`: iniciar sesión y revisar `sessionStorage.getItem("rol")` en la consola.
- Menú según el rol (Natalia), páginas protegidas (Jessica), comprobación del rol en la API (Nathaly).

---

## HU-10 · Cargar estructura de la plantilla (E11) — comparación formulario / resumen

### Nombres de los nueve campos

| # | Base de datos y vista previa | Formulario (`planilla.html`) | Resumen | Detalle de consulta | ¿Coincide? |
|---|---|---|---|---|---|
| 1 | Período | «Período de planilla» (Mes + Año) | Período | Período | ⚠️ |
| 2 | Código del empleado | Código | Código | Código | ❌ |
| 3 | Nombre completo | Nombre completo | Nombre completo | Nombre completo | ✅ |
| 4 | DUI | DUI | DUI | DUI | ✅ |
| 5 | Cargo | Cargo | Cargo | Cargo | ✅ |
| 6 | Salario base | Salario base | Salario base (USD) | Salario base (USD) | ⚠️ solo «(USD)» |
| 7 | Ingresos adicionales | Ingresos adicionales | Ingresos adicionales (USD) | Ingresos adicionales (USD) | ⚠️ solo «(USD)» |
| 8 | Descuentos totales | Descuentos totales | Descuentos totales (USD) | Descuentos totales (USD) | ⚠️ solo «(USD)» |
| 9 | Total a pagar | Total a pagar (USD) | Total líquido a pagar | Total líquido a pagar (USD) | ❌ |

Campos adicionales (no son de los nueve): el resumen y el detalle muestran «Plantilla» y «Total de ingresos (USD)» (HU-16).

### Valores (ejemplo 500.00 + 50.00 − 25.00, mes Octubre, año 2026)

| Dato | Formulario | Resumen | ¿Coincide? |
|---|---|---|---|
| Período | Octubre / 2026 | Octubre 2026 | ✅ |
| Salario base | 500.00 | $500.00 | ✅ |
| Ingresos adicionales | 50.00 | $50.00 | ✅ |
| Descuentos totales | 25.00 | $25.00 | ✅ |
| Total a pagar | 525.00 | $525.00 | ✅ |
| Datos del empleado | EMP001 · Ana Martínez · 01234567-8 · Analista administrativa | Iguales | ✅ |

### Diferencias registradas como tareas de corrección
1. **Código del empleado (criterio 5):** la vista previa dice «Código del empleado» y el formulario y el resumen dicen «Código». Unificar el nombre.
2. **Total a pagar (criterio 5):** la vista previa y el formulario dicen «Total a pagar», pero el resumen dice «Total líquido a pagar» (cambio de HU-16). **Hay que decidir en equipo** cuál nombre usar, porque el criterio 5 de HU-10 pide nombres iguales y el alcance de HU-16 llama «Total líquido a pagar» al mismo campo.
3. **Valor inicial 0.00 (criterio 3 / HU-06):** ingresos adicionales y descuentos totales muestran 0.00 solo como texto gris (`placeholder`). El campo empieza vacío y, si no se escribe nada, marca «Este campo es obligatorio».
4. **«(USD)»:** el resumen y el detalle lo agregan al nombre del campo, y el formulario lo muestra aparte («Dólares estadounidenses (USD)»). Diferencia menor; confirmar si el criterio 5 la acepta.

Los datos del empleado y el total a pagar son de solo lectura en el formulario (se muestran como texto, no como campos editables).

**Pendiente:** consolidar con las evidencias de Natalia (E7), Jessica (E8), Sara (E9) y Nathaly (E10).

---

## HU-11 · Registrar período (E16) — ensayo

Consulta del registro `42fc927f-caf2-4549-b161-4011174795ee` (guardado hoy a las 11:14):

| Dato | Base de datos | Listado | Detalle | ¿Coincide? |
|---|---|---|---|---|
| Período | mes 4, año 2024 | Abril 2024 | Abril 2024 | ✅ |
| Empleado | EMP001 · Ana Martínez | Ana Martínez | EMP001 · Ana Martínez | ✅ |
| Salario / ingresos / descuentos | 500 / 50 / 25 | — | $500.00 / $50.00 / $25.00 | ✅ |
| Total a pagar | 525 | $525.00 | $525.00 | ✅ |

**Pendiente:** repetir con el registro de prueba de Sara (E14) después de cerrar el sitio y volver a iniciar sesión, y reunir los criterios de Natalia (E12), Jessica (E13) y Nathaly (E15).

---

## HU-12 y HU-13 · Propuestas de acuerdo

**HU-12, formato del desglose de descuentos** (para Natalia y Nathaly):
- Arreglo `descuentos: [{ "concepto": "Préstamo", "importe": "10.00" }, ...]` en el guardado y en la consulta.
- `descuentos_totales` = suma del desglose, calculada de nuevo en la API.
- Ids sugeridos en el resumen y el detalle: `resumen-desglose-descuentos` y `detalle-desglose-descuentos`.

**HU-13, ids de los campos de horas** (para Natalia):
- Formulario: `horas-ordinarias` y `horas-extras`.
- Resumen: `resumen-horas-ordinarias` y `resumen-horas-extras`.
- Detalle: `detalle-horas-ordinarias` y `detalle-horas-extras`.
- API: `horas_ordinarias` y `horas_extras`.

---

## HU-15 · Confirmar empleados incluidos (E36) — ✅ comprobado

| Paso | Resultado |
|---|---|
| Al abrir el formulario | Casilla desmarcada, «Guardar planilla» deshabilitado ✅ |
| Resumen con Ana Martínez | EMP001 · Ana Martínez · 01234567-8 · Analista administrativa; casilla desmarcada; guardar deshabilitado ✅ |
| Al marcar la casilla | «Guardar planilla» se habilita ✅ |
| Al cambiar a Carlos Hernández | El resumen se oculta ✅ |
| Al volver a revisar | Solo aparece EMP002 · Carlos Hernández · 02345678-9 · Auxiliar contable; casilla desmarcada; guardar deshabilitado ✅ |
| Errores en la consola | Ninguno ✅ |

Observación para Natalia (E32): el resumen todavía no muestra «Empleados incluidos: 1» (criterios 1 y 5).

---

## HU-16 · Mostrar resumen de planilla (E41) — preparado

Cambios en `detalle-planilla.html` y `js/detalle-planilla.js`:
- El bloque de montos del detalle usa los mismos nombres y el mismo orden que el resumen: Salario base (USD), Ingresos adicionales (USD), **Total de ingresos (USD)**, Descuentos totales (USD) y **Total líquido a pagar (USD)**.
- «Total de ingresos» se toma de `total_ingresos` en la respuesta de la API. Mientras la API no lo envíe (Nathaly, E40), muestra «—». No se calcula en la pantalla para no crear una segunda fórmula.

Prueba con el registro `42fc927f…`: salario $500.00, ingresos $50.00, descuentos $25.00, total líquido $525.00 ✅. Total de ingresos: «—», en espera de la API.

**Pendiente:** cuando la API envíe `total_ingresos`, comprobar que el detalle muestre 550.00 en el ejemplo.
