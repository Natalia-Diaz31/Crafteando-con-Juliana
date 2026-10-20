# ADR 0002  Frontend en HTML y JavaScript sin framework

Estado: Aceptada 6 de octubre de 2026

# Contexto

El frontend del sistema de planillas se desarrolló utilizando HTML y JavaScript sin framework, principalmente porque JavaScript es un lenguaje que estamos aprendiendo actualmente y queríamos poner en práctica nuestros conocimientos.

Además, las tareas se distribuyeron entre los integrantes del equipo, por lo que se creó un archivo JavaScript por tarea. Esta estructura surgió de la distribución del trabajo y no de un diseño previo de la arquitectura.

# Decisión

Mantendremos el frontend en HTML y JavaScript sin framework durante los próximos sprints, conservando la estructura actual para evitar una reorganización completa del proyecto.

Sin embargo, podremos realizar mejoras graduales para reducir las dependencias entre archivos.

# Consecuencias

+ Reforzamos nuestros conocimientos de JavaScript al trabajar directamente con el lenguaje.

+ Evitamos el tiempo de adaptación a un framework nuevo.

+ La separación de archivos facilita la distribución de tareas entre los integrantes del equipo.

- Existe un alto acoplamiento entre los archivos JavaScript, por lo que modificar una función puede afectar otras partes del sistema.

- El funcionamiento de algunas funciones depende del orden en que se cargan los archivos, lo que aumenta el riesgo de errores.

- A medida que agreguemos funcionalidades, será más difícil mantener y reorganizar el código debido a las dependencias existentes.