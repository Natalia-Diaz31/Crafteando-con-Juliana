// ARCHIVO: Punto de entrada de la API: configura Express, conecta Supabase y monta los módulos de rutas
// Buscar: server, api, inicio, rutas, montaje

// Qué hace: Carga las variables de entorno y las librerías base
// Buscar: dotenv, require, librerías
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { respuestaExitosa, respuestaError } = require("./utils/respuestas");


// Qué hace: Crea la aplicación Express
// Buscar: app, express
const app = express();



// Qué hace: Permite llamadas solo desde el sitio publicado y el servidor local 5500
// Buscar: cors, origen, dominio
app.use(cors({
    origin: [
        "https://sistemadeplanillas.vercel.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ]
}));

// Qué hace: Lee el cuerpo de las solicitudes en formato JSON
// Buscar: json, cuerpo, body
app.use(express.json());

// Conexión con nuestra base de datos
// Qué hace: Crea el cliente de Supabase con las claves del entorno
// Buscar: supabase, base de datos, conexión
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

// Sesión y permisos (HU-02 y HU-09).
// Qué hace: Prepara los middlewares de sesión y rol que usan las rutas
// Buscar: token, rol, permisos, middleware
const crearMiddlewaresAutenticacion = require("./middlewares/autenticacion");
const { verificarToken, verificarRolNomina } =
    crearMiddlewaresAutenticacion({ supabase, env: process.env });

// Comprobar que funciona la API
// Qué hace: Responde si la API está en línea (lo usa el despliegue)
// Buscar: health, salud, estado
app.get("/health", (req, res) => {
    return respuestaExitosa(res, "API funcionando");
});

//
// HU-02: INICIO DE SESIÓN
//

const crearRutasAuth = require("./routes/auth");

// Qué hace: Monta el inicio de sesión
// Buscar: login, auth, HU-02
app.use("/api/auth", crearRutasAuth({ supabase, env: process.env }));


//
// HU-03: CONSULTAR PLANTILLA
//

const crearRutasPlantillas = require("./routes/plantillas");

// Qué hace: Monta la consulta de la plantilla
// Buscar: plantillas, HU-03
app.use("/api/plantillas", crearRutasPlantillas({ supabase, verificarToken }));


//
// HU-04: BUSCAR EMPLEADOS
//

// HU-24: rutas y servicio de búsqueda de empleados.
const crearServicioEmpleados = require("./services/empleados");
const crearRutasEmpleados = require("./routes/empleados");

const servicioEmpleados = crearServicioEmpleados(supabase);

// Qué hace: Monta la búsqueda, lista, departamentos y sucursales de empleados
// Buscar: empleados, buscar, lista, HU-04, HU-24
app.use(
    "/api/empleados",
    crearRutasEmpleados({
        servicio: servicioEmpleados,
        verificarToken,
        verificarRolNomina
    })
);

//
// HU-05: CONSULTAR DATOS BÁSICOS DE UN EMPLEADO
//

const crearRutasDetalleEmpleado = require("./routes/detalle-empleado");

// Qué hace: Monta los datos de un empleado por su id
// Buscar: empleado por id, HU-05
app.use("/api/empleados", crearRutasDetalleEmpleado({ supabase, verificarToken }));

//
// HU-08: GUARDAR UNA PLANILLA
//

// Qué hace: Prepara la comprobación de empleado y plantilla antes de guardar
// Buscar: referencias, verificar empleado
const crearVerificarReferencias = require("./services/referencias-planilla");
const verificarReferenciasPlanilla = crearVerificarReferencias(supabase);
const crearRutasGuardarPlanilla = require("./routes/guardar-planilla");

// Qué hace: Monta el guardado de planillas (POST /api/planillas)
// Buscar: guardar planilla, HU-08, HU-17
app.use(
    "/api/planillas",
    crearRutasGuardarPlanilla({ supabase, verificarToken, verificarRolNomina, verificarReferenciasPlanilla })
);

//
// HU-08: CONSULTAR PLANILLAS GUARDADAS
//

const { formatearPeriodo } = require("./utils/periodo");

// HU-25: Historial de planillas con filtro por empleado y paginación.
const crearServicioPlanillas = require("./services/planillas");
const crearRutasPlanillas = require("./routes/historial-planillas");

// Qué hace: Crea el servicio de consultas de planillas que comparten varias rutas
// Buscar: servicio planillas, historial
const servicioPlanillas = crearServicioPlanillas(supabase);
// HU-28: consulta de la planilla mensual anterior para comparación.
const crearRutasComparacion = require("./routes/comparacion-planillas");

// Qué hace: Monta la comparación con la planilla anterior
// Buscar: comparación, HU-28
app.use(
    "/api/planillas",
    crearRutasComparacion({
        servicio: servicioPlanillas,
        verificarToken,
        verificarRolNomina,
        formatearPeriodo
    })
);

// HU-27: preparar la duplicación de una planilla guardada.
const crearRutasDuplicacion = require("./routes/duplicar-planilla");

// Qué hace: Monta la duplicación de planillas
// Buscar: duplicar, HU-27
app.use(
    "/api/planillas",
    crearRutasDuplicacion({
        servicio: servicioPlanillas,
        supabase,
        verificarToken,
        verificarRolNomina
    })
);

// Qué hace: Monta el historial paginado de planillas
// Buscar: historial, paginación, HU-25
app.use(
    "/api/planillas",
    crearRutasPlanillas({
        servicio: servicioPlanillas,
        verificarToken,
        verificarRolNomina,
        formatearPeriodo
    })
);


// Detalle: todos los datos guardados de una planilla.
const crearRutasDetallePlanilla = require("./routes/detalle-planilla");

// Qué hace: Monta el detalle de una planilla
// Buscar: detalle planilla, HU-08
app.use(
    "/api/planillas",
    crearRutasDetallePlanilla({ supabase, verificarToken, verificarRolNomina })
);

// HU-22: rutas de importación CSV.
const crearRutasImportacion = require("./routes/importacion");

// Qué hace: Monta la validación de la importación CSV
// Buscar: importación, csv, HU-22
app.use(
    "/api/planillas",
    crearRutasImportacion({
        supabase,
        verificarToken,
        verificarRolNomina
    })
);

//
// HU-23: BORRADORES
//

const crearRutasBorradores = require("./routes/borradores");

// Qué hace: Monta las rutas de borradores
// Buscar: borradores, HU-23
app.use(
    "/api/borradores",
    crearRutasBorradores({ supabase, verificarToken, verificarRolNomina, verificarReferenciasPlanilla })
);

//
// HU-01: RESPUESTA COMPARTIDA PARA RUTAS NO ENCONTRADAS
//

// Qué hace: Responde 404 a cualquier ruta que no existe
// Buscar: 404, ruta no encontrada
app.use((req, res) => {
    return respuestaError(res, "Ruta no encontrada", 404);
});

// Qué hace: Inicia el servidor en el puerto del entorno o el 3000
// Buscar: puerto, listen, iniciar servidor
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});
