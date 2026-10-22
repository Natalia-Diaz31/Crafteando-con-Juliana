# ADR 0006  - Mantener temporalmente las reglas de nómina duplicadas

Estado: Aceptada - 22 de octubre del 2026 

# Contexto 

Las reglas de cálculo de ISSS, AFP y renta están duplicadas en js/reglas-nomina.js y api_/utils/reglas-nomina.js. Esto permite calcular desde el navegador y verificar desde la API, pero requiere modificar ambos archivos cuando cambian las reglas.

# Decisión 

Se decide mantener ambos archivos durante el Sprint 4 y la estabilización para evitar cambios que puedan afectar el sistema. Se utilizará la prueba automatizada existente para comprobar que estén sincronizados.

# Consecuencias 

+ Se evitan cambios que podrían afectar el funcionamiento del sistema.

+ Se mantienen los cálculos y su verificación desde la API.

- Se deben actualizar ambos archivos cuando cambien las reglas.

- Existe riesgo de inconsistencias si no se mantienen sincronizados.
