 # ADR 0001  - Supabase como base de datos detrás de una API Express 

Estado: Aceptada - 4 de octubre del 2026 

# Contexto 

El sistema necesita almacenar y consultar información sensible de empleados, planillas y descuentos en un solo lugar para evitar que se acceda a ella de forma independiente. Además, el sistema necesita comunicarse con la base de datos de forma controlada. 

# Decisión 

El sistema utilizará Supabase como base de datos, y una API desarrollada con Express, desplegada en Vercel, como intermediaria entre el frontend y la base de datos.  

# Consecuencias 

+ El equipo cuenta con experiencia utilizando Vercel, lo que facilita el despliegue y mantenimiento de la API. 

+ Supabase permite crear y administrar la base de datos sin necesidad de configurar y mantener un servidor de base de datos propio. 

- Al utilizar Express, Vercel y Supabase, el equipo debe mantener correctamente la comunicación y configuración entre las tres tecnologías. 

- El mantenimiento de la base de datos y su integración con la API puede depender de los integrantes con mayor conocimiento de estas tecnologías. 
