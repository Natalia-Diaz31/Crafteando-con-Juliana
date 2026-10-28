
require("dotenv").config();

const jwt = require("jsonwebtoken");
const express = require("express");
const { esUUIDValido } = require("./utils/validar-uuid");
const { validarNovedades, contarDias } = require("./utils/validar-novedades");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { respuestaExitosa, respuestaError } = require("./utils/respuestas");

const ReglasNomina = require("./utils/reglas-nomina.js");

const app = express();

const {
    validarSalarioEIngresos
} = require("./utils/validar-ingresos");


app.use(cors({
    origin: [
        "https://sistemadeplanillas.vercel.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ]
}));

app.use(express.json());

// Conexión con nuestra base de datos
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

// Comprobar que funciona la API
app.get("/health", (req, res) => {
    return respuestaExitosa(res, "API funcionando");
});

//
// HU-02: INICIO DE SESIÓN
//

app.post("/api/auth/login", async (req, res) => {
    try {
        // 1. Recibir correo y contraseña
        const { correo, contrasena } = req.body || {};

        // 2. Comprobar que ambos campos estén llenos
        if (
            typeof correo !== "string" ||
            typeof contrasena !== "string" ||
            !correo.trim() ||
            !contrasena
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe ingresar correo y contraseña"
            });
        }

        // 3. Consultar Supabase
        const { data, error } = await supabase.rpc(
            "verificar_login",
            {
                p_correo: correo.trim(),
                p_contrasena: contrasena
            }
        );

        // 4. Comprobar errores de base de datos
        if (error) {
            console.error("Error en login:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "Error al verificar las credenciales"
            });
        }

        // 5. Verificar si la cuenta existe
        const usuario = data?.[0];

        if (!usuario) {
            return res.status(401).json({
                ok: false,
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        // 6. Crear token de sesión
        const token = jwt.sign(
            {
                id: usuario.id,
                correo: usuario.correo,
                rol: usuario.rol
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        // 7. Responder al frontend
        return res.status(200).json({
            ok: true,
            mensaje: "Inicio de sesión exitoso",
            token: token,
            usuario: {
                id: usuario.id,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });

    } catch (error) {
        console.error("Error del servidor:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor"
        });
    }
});


//
// HU-03: CONSULTAR PLANTILLA
//

app.get("/api/plantillas", verificarToken, async (req, res) => {
    try {
        // 1. Buscar nuestra plantilla en Supabase
        const { data: plantilla, error: errorPlantilla } =
            await supabase
                .from("plantillas")
                .select("id, nombre, descripcion")
                .eq("nombre", "Planilla básica mensual")
                .single();

        if (errorPlantilla || !plantilla) {
            console.error("Error plantilla:", errorPlantilla);

            return res.status(404).json({
                ok: false,
                mensaje: "No se encontró la plantilla"
            });
        }

        // 2. Buscar los campos de esa plantilla
        const { data: campos, error: errorCampos } =
            await supabase
                .from("campos_plantilla")
                .select("nombre, orden")
                .eq("plantilla_id", plantilla.id)
                .order("orden", { ascending: true });

        if (errorCampos) {
            console.error("Error campos:", errorCampos);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudieron consultar los campos"
            });
        }

        // 3. Devolver la información al frontend
        return res.status(200).json({
            ok: true,
            plantilla: {
                id: plantilla.id,
                nombre: plantilla.nombre,
                descripcion: plantilla.descripcion,
                campos: campos
            }
        });

    } catch (error) {
        console.error("Error del servidor:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor"
        });
    }
});


//
// HU-04: BUSCAR EMPLEADOS
//

// Verificar que el usuario haya iniciado sesión
function verificarToken(req, res, next) {
    const autorizacion = req.headers.authorization || "";
    const partes = autorizacion.split(" ");

    if (partes.length !== 2 || partes[0] !== "Bearer") {
        return res.status(401).json({
            ok: false,
            mensaje: "Debe iniciar sesión"
        });
    }

    try {
        req.usuario = jwt.verify(
            partes[1],
            process.env.JWT_SECRET
        );

        next();
    } catch (error) {
        return res.status(401).json({
            ok: false,
            mensaje: "Sesión inválida o expirada"
        });
    }
}

// HU-09: Verificar permisos del encargado de nómina
async function verificarRolNomina(req, res, next) {
    try {
        // Obtener el ID de la cuenta autenticada
        const idUsuario = req.usuario?.id;

        if (!idUsuario) {
            return res.status(401).json({
                ok: false,
                mensaje: "Debe iniciar sesión"
            });
        }

        // Consultar el rol real en Supabase
        const { data, error } = await supabase
            .from("cuentas")
            .select("rol")
            .eq("id", idUsuario)
            .maybeSingle();

        if (error) {
            console.error("Error al consultar el rol:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "Error al verificar los permisos"
            });
        }

        // Comprobar que la cuenta tenga el rol requerido
        if (!data || data.rol !== "Encargado de nómina") {
            return res.status(403).json({
                ok: false,
                mensaje: "No tiene permisos para acceder a esta función"
            });
        }

        // Permitir continuar con la operación
        next();

    } catch (error) {
        console.error("Error de autorización:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor"
        });
    }
}

// HU-24: rutas y servicio de búsqueda de empleados.
const crearServicioEmpleados = require("./services/empleados");
const crearRutasEmpleados = require("./routes/empleados");

const servicioEmpleados = crearServicioEmpleados(supabase);

app.use(
    "/api/empleados",
    crearRutasEmpleados({
        servicio: servicioEmpleados,
        verificarToken
    })
);

//
// HU-05: CONSULTAR DATOS BÁSICOS DE UN EMPLEADO
//

app.get("/api/empleados/:id", verificarToken, async (req, res) => {
    try {
        // 1. Obtener el identificador del empleado
        const id = String(req.params.id || "").trim();

        // Comprobar que el identificador tenga formato UUID
        const formatoUUID =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!formatoUUID.test(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Identificador de empleado inválido"
            });
        }

        // 2. Consultar los datos registrados en Supabase
        const { data: empleado, error } = await supabase
            .from("empleados")
            .select("codigo, nombre_completo, dui, cargo, salario_base_mensual")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error al consultar empleado:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo consultar el empleado"
            });
        }

        // 3. Comprobar que el empleado exista
        if (!empleado) {
            return res.status(404).json({
                ok: false,
                mensaje: "Empleado no encontrado"
            });
        }

        // 4. Devolver los cuatro datos básicos
        return res.status(200).json({
            ok: true,
            empleado: {
                codigo: empleado.codigo,
                nombre_completo: empleado.nombre_completo,
                dui: empleado.dui,
                cargo: empleado.cargo,
                salario_base_mensual: empleado.salario_base_mensual
            }
        });

    } catch (error) {
        console.error("Error del servidor:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor"
        });
    }
});

//
// HU-08: VALIDAR DATOS ANTES DE GUARDAR UNA PLANILLA
//

function validarDatosPlanilla(req, res, next) {
    const datos = req.body || {};
    const errores = {};
    const esPlanillaPorDias = datos.modo_calculo === "dias"; // HU-19: identificar las nuevas planillas calculadas por días.

    const formatoUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Identificadores del empleado y de la plantilla.
    for (const campo of ["empleado_id", "plantilla_id"]) {
        if (
            typeof datos[campo] !== "string" ||
            !formatoUUID.test(datos[campo])
        ) {
            errores[campo] =
                "Debe seleccionar un registro con identificador válido";
        }
    }

    // Aceptar únicamente texto o números; rechazar objetos y booleanos.
    function obtenerTexto(valor) {
        if (typeof valor === "string") {
            return valor.trim();
        }

        if (typeof valor === "number" && Number.isFinite(valor)) {
            return String(valor);
        }

        return "";
    }

    const mesTexto = obtenerTexto(datos.mes);
    const anioTexto = obtenerTexto(datos.anio);

    // El mes debe recibirse como número: 1 hasta 12.
    if (
        !/^\d{1,2}$/.test(mesTexto) ||
        Number(mesTexto) < 1 ||
        Number(mesTexto) > 12
    ) {
        errores.mes = "Seleccione un mes entre 1 y 12";
    }

    // Año de cuatro cifras, distinto de 0000.
    if (
        !/^\d{4}$/.test(anioTexto) ||
        Number(anioTexto) === 0
    ) {
        errores.anio = "Ingrese un año válido de cuatro cifras";
    }

    const {
    salario,
    ingresos,
    ingresosDetalle,
    errores: erroresIngresos
} = validarSalarioEIngresos(datos);

Object.assign(errores, erroresIngresos);

    // HU-13: validar cantidades de horas sin modificar los montos monetarios.
    function obtenerHoras(campo) {
        const texto = obtenerTexto(datos[campo]);

        if (!texto) {
            errores[campo] = "Este campo es obligatorio";
            return null;
        }

        if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) {
            errores[campo] =
                "Ingrese una cantidad mayor o igual a cero, con máximo dos decimales";
            return null;
        }

        const [entero, decimal = ""] = texto.split(".");
        const centesimas =
            Number(entero) * 100 +
            Number(decimal.padEnd(2, "0"));

        if (!Number.isSafeInteger(centesimas) || centesimas > 9999999999) {
            errores[campo] = "Las horas no pueden superar 99999999.99";
            return null;
        }

        return (centesimas / 100).toFixed(2);
    }

    // HU-19: las nuevas planillas por días no requieren horas.
    const horasOrdinarias = esPlanillaPorDias
        ? null
        : obtenerHoras("horas_ordinarias");

    const horasExtras = esPlanillaPorDias
        ? null
        : obtenerHoras("horas_extras");

    // HU-12: validar el detalle y calcular los descuentos en la API.
    const detalleDescuentos = [];
    let descuentos = 0;

    if (!Array.isArray(datos.descuentos)) {
        errores.descuentos = "Debe enviar una lista de descuentos";
        descuentos = null;
    } else {
        datos.descuentos.forEach((descuento, indice) => {
            const concepto =
                typeof descuento?.concepto === "string"
                    ? descuento.concepto.trim()
                    : "";

            const importeTexto = obtenerTexto(descuento?.importe);

            if (["isss", "afp", "renta"].includes(concepto.toLowerCase())) {
                errores[`descuentos[${indice}].concepto`] = "ISSS, AFP y Renta son deducciones automáticas; no las registre manualmente";
            } else if (!concepto) {
                errores[`descuentos[${indice}].concepto`] =
                    "El concepto es obligatorio";
            }

            if (!/^\d+(?:\.\d{1,2})?$/.test(importeTexto)) {
                errores[`descuentos[${indice}].importe`] =
                    "Ingrese un importe válido con máximo dos decimales";
                return;
            }

            const [entero, decimal = ""] = importeTexto.split(".");

            const importeCentavos =
                Number(entero) * 100 +
                Number(decimal.padEnd(2, "0"));

            if (
                !Number.isSafeInteger(importeCentavos) ||
                importeCentavos <= 0 ||
                importeCentavos > 999999999999
            ) {
                errores[`descuentos[${indice}].importe`] =
                    "El importe debe ser mayor que cero y no superar 9999999999.99";
                return;
            }

            descuentos += importeCentavos;

            if (concepto) {
                detalleDescuentos.push({
                    concepto,
                    importe: (importeCentavos / 100).toFixed(2)
                });
            }
        });

        if (
            !Number.isSafeInteger(descuentos) ||
            descuentos > 999999999999
        ) {
            errores.descuentos =
                "La suma de descuentos supera el monto permitido";
            descuentos = null;
        }
    }

    // HU-19: calcular los días remunerados antes de aplicar las deducciones.
    const resultadoNovedades = validarNovedades(
        datos.novedades,
        {
            mes: Number(mesTexto),
            anio: Number(anioTexto),
            frecuencia: datos.periodo_pago
        }
    );

    if (!resultadoNovedades.valido) {
        errores.novedades = resultadoNovedades.errores.join(". ");
    }

    // HU-14: la API recalcula. Nunca acepta importes legales enviados por el navegador.
    let deduccionesLegales = null;
    if (datos.version_regla !== ReglasNomina.VERSION) {
        errores.version_regla = "Las reglas cambiaron. Recargue y revise nuevamente la planilla";
    }
    if (salario !== null && ingresos !== null) {
        try {
            deduccionesLegales = esPlanillaPorDias
                ? ReglasNomina.calcularPorDias({
                    salario_base_mensual: datos.salario_base_mensual,
                    dias_remunerados: resultadoNovedades.diasRemunerados,
                    ingresos_adicionales: ingresos === null
                        ? null
                        : (ingresos / 100).toFixed(2),
                    periodo_pago: datos.periodo_pago,
                    mes: datos.mes,
                    anio: datos.anio
                })
                : ReglasNomina.calcular({
                    salario_base: datos.salario_base,
                    ingresos_adicionales: ingresos === null
                        ? null
                        : (ingresos / 100).toFixed(2),
                    periodo_pago: datos.periodo_pago,
                    mes: datos.mes,
                    anio: datos.anio
                });
            if (descuentos !== null) {
                descuentos += ReglasNomina.centavos(deduccionesLegales.total);
                // La función SQL ya suma el detalle: incluir cada importe legal una vez.
                for (const item of deduccionesLegales.detalle) {
                    if (ReglasNomina.centavos(item.importe) > 0) {
                        detalleDescuentos.push({ concepto: item.nombre, importe: item.importe });
                    }
                }
                if (descuentos > 999999999999) errores.descuentos_totales = "La suma de descuentos supera el monto permitido";
            }
        } catch (error) {
            errores.deducciones_legales = error.message;
        }
    }

    let total = null;
    let totalIngresos = null;

    // HU-19: utilizar el salario proporcional para calcular los importes.
    const salarioCalculado = esPlanillaPorDias
        ? (
            deduccionesLegales?.salario_proporcional !== undefined
                ? ReglasNomina.centavos(deduccionesLegales.salario_proporcional)
                : null
        )
        : salario;

    if (
        salarioCalculado !== null &&
        ingresos !== null &&
        descuentos !== null
    ) {
        const sumaIngresos = salarioCalculado + ingresos;
        totalIngresos = sumaIngresos;

        if (!Number.isSafeInteger(sumaIngresos)) {
            errores.ingresos_adicionales =
                "La suma de ingresos supera el valor que el sistema puede procesar";
        } else if (descuentos > sumaIngresos) {
            errores.descuentos_totales =
                "Los descuentos no pueden superar los ingresos";
        } else {
            total = sumaIngresos - descuentos;

            if (total > 999999999999) {
                errores.total_pagar =
                    "El total a pagar no puede superar 9999999999.99";
            }
        }
    }

    if (Object.keys(errores).length > 0) {
        return res.status(400).json({
            ok: false,
            mensaje: "Corrija los datos de la planilla",
            errores
        });
    }

    // Convertir centavos a texto decimal sin redondear los datos.
    function aDecimal(centavos) {
        const entero = Math.floor(centavos / 100);
        const decimal = String(centavos % 100).padStart(2, "0");

        return `${entero}.${decimal}`;
    }

    // La ruta de guardado utilizará estos datos ya validados.
    req.planillaValidada = {
        periodo_pago: datos.periodo_pago,
        deducciones_legales: deduccionesLegales,
        empleado_id: datos.empleado_id,
        plantilla_id: datos.plantilla_id,
        mes: Number(mesTexto),
        anio: Number(anioTexto),
        // HU-18: novedades validadas y días calculados por la API.
        novedades: resultadoNovedades.novedades,

        dias_remunerados: resultadoNovedades.diasRemunerados,

        // HU-19: conservar el salario mensual y el proporcional.
        modo_calculo: esPlanillaPorDias ? "dias" : "horas",
        salario_base_mensual: esPlanillaPorDias ? aDecimal(salario) : null,
        salario_proporcional: esPlanillaPorDias ? aDecimal(salarioCalculado) : null,

        // HU-21: conservar el motivo para validarlo contra Supabase.
        motivo_ajuste: datos.motivo_ajuste,

        // Mantener salario_base como importe utilizado para el pago.
        salario_base: aDecimal(salarioCalculado),
        ingresos_adicionales: aDecimal(ingresos),
        ingresos_detalle: ingresosDetalle,
        total_ingresos: aDecimal(totalIngresos),

        // HU-13: cantidades de horas trabajadas.
        horas_ordinarias: horasOrdinarias,
        horas_extras: horasExtras,

        // HU-12: total calculado por la API y detalle validado.
        descuentos_totales: aDecimal(descuentos),
        descuentos: detalleDescuentos,

        total_pagar: aDecimal(total)
    };

    return next();
}

// HU-23: adaptar el contenido recuperado de un borrador
// al contrato de validación de una planilla definitiva.
function prepararDatosDesdeBorrador(contenido) {
    const esMensual = contenido.periodo_pago === "mensual";

    return {
        periodo_pago: contenido.periodo_pago,
        modo_calculo: esMensual ? "dias" : "horas",
        version_regla: ReglasNomina.VERSION,

        plantilla_id: contenido.plantilla?.id ?? null,
        empleado_id: contenido.empleado?.id ?? null,

        mes: contenido.mes,
        anio: contenido.anio,

        salario_base: contenido.salario_base,
        salario_base_mensual: contenido.salario_base,

        ingresos_adicionales: contenido.ingresos_adicionales,

        horas_ordinarias: esMensual
            ? null
            : contenido.horas_ordinarias,

        horas_extras: esMensual
            ? null
            : contenido.horas_extras,

        descuentos: contenido.descuentos,
        novedades: contenido.novedades,
        ingresos_detalle: contenido.ingresos,

        motivo_ajuste: contenido.motivo_ajuste
    };
}
// HU-23: consultar y comprobar los registros necesarios
// para guardar una planilla definitiva.
async function verificarReferenciasPlanilla(datos) {
    const { data: empleado, error: errorEmpleado } = await supabase
        .from("empleados")
        .select("id, codigo, nombre_completo, dui, cargo, salario_base_mensual")
        .eq("id", datos.empleado_id)
        .maybeSingle();

    if (errorEmpleado) throw errorEmpleado;

    if (!empleado) {
        return {
            error: {
                estado: 404,
                mensaje: "El empleado seleccionado no existe"
            }
        };
    }

    const salarioOriginal = empleado.salario_base_mensual;

    const salarioUtilizado = datos.modo_calculo === "dias"
        ? datos.salario_base_mensual
        : datos.salario_base;

    const motivo = typeof datos.motivo_ajuste === "string"
        ? datos.motivo_ajuste.trim()
        : "";

    const tieneSalarioOriginal =
        salarioOriginal !== null && salarioOriginal !== undefined;

    const ajustado = tieneSalarioOriginal &&
        Math.round(Number(salarioOriginal) * 100) !==
        Math.round(Number(salarioUtilizado) * 100);

    if (ajustado && (motivo.length < 1 || motivo.length > 200)) {
        return {
            error: {
                estado: 400,
                mensaje: "Corrija el ajuste salarial",
                errores: {
                    motivo_ajuste:
                        "El motivo del ajuste debe tener entre 1 y 200 caracteres"
                }
            }
        };
    }

    const { data: plantilla, error: errorPlantilla } = await supabase
        .from("plantillas")
        .select("id, nombre")
        .eq("id", datos.plantilla_id)
        .maybeSingle();

    if (errorPlantilla) throw errorPlantilla;

    if (!plantilla) {
        return {
            error: {
                estado: 404,
                mensaje: "La plantilla seleccionada no existe"
            }
        };
    }

    if (plantilla.nombre !== "Planilla básica mensual") {
        return {
            error: {
                estado: 400,
                mensaje: "Seleccione la plantilla Planilla básica mensual"
            }
        };
    }

    return { empleado, plantilla };
}

// HU-23: construir el registro definitivo a partir de datos validados.
// Se reutiliza tanto en el guardado normal como en la finalización.
function construirRegistroPlanilla(datos, empleado, plantilla) {
    const salarioOriginal = empleado.salario_base_mensual;

    const salarioUtilizado = datos.modo_calculo === "dias"
        ? datos.salario_base_mensual
        : datos.salario_base;

    const tieneSalarioOriginal =
        salarioOriginal !== null && salarioOriginal !== undefined;

    const ajustado = tieneSalarioOriginal &&
        Math.round(Number(salarioOriginal) * 100) !==
        Math.round(Number(salarioUtilizado) * 100);

    const motivo = typeof datos.motivo_ajuste === "string"
        ? datos.motivo_ajuste.trim()
        : "";

    return {
        periodo_pago: datos.periodo_pago,
        deducciones_legales: datos.deducciones_legales,
        plantilla_id: plantilla.id,
        empleado_id: empleado.id,
        mes: datos.mes,
        anio: datos.anio,
        plantilla_nombre: plantilla.nombre,
        empleado_codigo: empleado.codigo,
        empleado_nombre: empleado.nombre_completo,
        empleado_dui: empleado.dui,
        empleado_cargo: empleado.cargo,
        modo_calculo: datos.modo_calculo,
        salario_base_mensual: datos.salario_base_mensual,
        dias_remunerados: datos.dias_remunerados,
        salario_proporcional: datos.salario_proporcional,
        salario_original: salarioOriginal ?? null,
        motivo_ajuste: ajustado ? motivo : null,
        salario_base: datos.salario_base,
        ingresos_adicionales: datos.ingresos_adicionales,
        horas_ordinarias: datos.horas_ordinarias,
        horas_extras: datos.horas_extras,
        descuentos_totales: datos.descuentos_totales,
        total_pagar: datos.total_pagar
    };
}

//
// HU-08: GUARDAR UNA PLANILLA
//
// HU-17: validar el identificador de cada operación de guardado.
function validarIdentificadorOperacion(req, res, next) {
    const operacionId = req.body?.operacion_id;

    if (!esUUIDValido(operacionId)) {
        return res.status(400).json({
            ok: false,
            mensaje: "Identificador de operación inválido",
            errores: {
                operacion_id: "Debe proporcionar un UUID válido"
            }
        });
    }

    req.operacionId = operacionId;
    return next();
}

app.post(
    "/api/planillas",
    verificarToken,
    verificarRolNomina, // HU-09: comprobar permisos
    validarIdentificadorOperacion, // HU-17
    validarDatosPlanilla,
    async (req, res) => {
        try {
            const datos = req.planillaValidada;
            const referencias = await verificarReferenciasPlanilla(datos);

            if (referencias.error) {
                const { estado, ...respuesta } = referencias.error;

                return res.status(estado).json({
                    ok: false,
                    ...respuesta
                });
            }

            const { empleado, plantilla } = referencias;

            // Construir el registro definitivo con los datos validados.
            const registro = construirRegistroPlanilla(
                datos,
                empleado,
                plantilla
            );

            // HU-12: guardar la planilla y sus descuentos
            // en una sola transacción de PostgreSQL.
            const parametrosGuardado = {
                p_registro: registro,
                p_descuentos: datos.descuentos,
                p_operacion_id: req.operacionId,
                p_novedades: datos.novedades
            };

            // HU-20: enviar el detalle cuando esté disponible.
            if (datos.ingresos_detalle !== null) {
                parametrosGuardado.p_ingresos = datos.ingresos_detalle;
            }

            const {
                data: resultado,
                error: errorGuardado
            } = await supabase.rpc(
                "guardar_planilla_con_descuentos",
                parametrosGuardado
            );

            // La función devuelve una lista con la planilla guardada.
            const planilla = resultado?.[0];

            // Comprobar que Supabase guardó correctamente la planilla.
            if (errorGuardado) {
                throw errorGuardado;
            }

            if (!planilla?.id) {
                throw new Error(
                    "El guardado no devolvió un identificador"
                );
            }

            // Confirmar únicamente después de guardar.
            return res.status(planilla.creada_nueva === false ? 200 : 201).json({
                ok: true,
                mensaje: "Planilla guardada",
                id: planilla.id,
                fecha_guardado: planilla.fecha_guardado,
                salario_base: datos.salario_base,
                ingresos_adicionales: datos.ingresos_adicionales,
                total_ingresos: datos.total_ingresos,
                descuentos_totales: datos.descuentos_totales,
                total_pagar: planilla.total_pagar
            });
        } catch (error) {
            console.error("Error al guardar planilla:", error);

            return res.status(500).json({
                ok: false,
                mensaje:
                    "No se pudo guardar la planilla. Intente nuevamente"
            });
        }
    }
);

//
// HU-08: CONSULTAR PLANILLAS GUARDADAS
//

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Mostrar el período igual que en el resumen: "Octubre 2026"
function formatearPeriodo(mes, anio) {
    return `${MESES[mes - 1] || mes} ${anio}`;
}

 // HU-25: Historial de planillas con filtro por empleado y paginación.
const crearServicioPlanillas = require("./services/planillas");
const crearRutasPlanillas = require("./routes/historial-planillas");

const servicioPlanillas = crearServicioPlanillas(supabase);

app.use(
    "/api/planillas",
    crearRutasPlanillas({
        servicio: servicioPlanillas,
        verificarToken,
        verificarRolNomina,
        formatearPeriodo
    })
);


// Detalle: todos los datos guardados de una planilla
app.get("/api/planillas/:id", verificarToken, verificarRolNomina, async (req, res) => {
    try {
        // 1. Comprobar que el identificador tenga formato UUID
        const id = String(req.params.id || "").trim();

        const formatoUUID =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!formatoUUID.test(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Identificador de planilla inválido"
            });
        }

        // 2. Consultar la planilla guardada
        const { data: planilla, error } = await supabase
            .from("planillas")
            .select(
                "id, mes, anio, plantilla_nombre, empleado_codigo, empleado_nombre, " +
                "empleado_dui, empleado_cargo, salario_base, salario_original, motivo_ajuste, ingresos_adicionales, " +
                "horas_ordinarias, horas_extras, " +
                "descuentos_totales, total_pagar, fecha_guardado, periodo_pago, deducciones_legales, " +
                "dias_remunerados"
            )
            .eq("id", id)
            .maybeSingle();

        if (error) throw error;

        if (!planilla) {
            return res.status(404).json({
                ok: false,
                mensaje: "Planilla no encontrada"
            });
        }

        // HU-12: consultar los descuentos asociados a la planilla.
        const {
            data: detalleDescuentos,
            error: errorDescuentos
        } = await supabase
            .from("planilla_descuentos")
            .select("concepto, importe")
            .eq("planilla_id", id)
            .order("id", { ascending: true });

        if (errorDescuentos) {
            throw errorDescuentos;
        }

        // HU-20: consultar los bonos e incentivos guardados.
        const {
            data: detalleIngresos,
            error: errorIngresos
        } = await supabase
            .from("planilla_ingresos")
            .select("tipo, concepto, importe, origen")
            .eq("planilla_id", id);

        if (errorIngresos) {
            throw errorIngresos;
        }

        // HU-18: novedades guardadas, con los días de cada una.
        const { data: novedades, error: errorNovedades } = await supabase
            .from("planilla_novedades")
            .select("tipo, fecha_inicio, fecha_fin, condicion_pago")
            .eq("planilla_id", id)
            .order("fecha_inicio", { ascending: true });

        if (errorNovedades) throw errorNovedades;

        // HU-16: calcular el total de ingresos con los montos guardados.
        const salarioCentavos = Math.round(Number(planilla.salario_base) * 100);
        const ingresosCentavos = Math.round(Number(planilla.ingresos_adicionales) * 100);

        const totalIngresosCentavos = salarioCentavos + ingresosCentavos;

        if (
            !Number.isSafeInteger(totalIngresosCentavos) ||
            totalIngresosCentavos > 999999999999
        ) {
            throw new Error("Total de ingresos fuera del rango permitido");
        }

        const totalIngresos = (totalIngresosCentavos / 100).toFixed(2);

        // 3. Devolver los datos con los nombres que usa la pantalla
        return res.status(200).json({
            ok: true,
            planilla: {
                id: planilla.id,
                plantilla: planilla.plantilla_nombre,
                periodo: formatearPeriodo(planilla.mes, planilla.anio),
                fecha_guardado: planilla.fecha_guardado,
                codigo: planilla.empleado_codigo,
                nombre_completo: planilla.empleado_nombre,
                dui: planilla.empleado_dui,
                cargo: planilla.empleado_cargo,
                salario_base: planilla.salario_base,
                // HU-21: mostrar los datos del ajuste salarial guardado.
                salario_original: planilla.salario_original,
                motivo_ajuste: planilla.motivo_ajuste,
                ingresos_adicionales: planilla.ingresos_adicionales,
                ingresos_detalle: detalleIngresos || [],
                detalle_ingresos_registrado: (detalleIngresos || []).length > 0,
                total_ingresos: totalIngresos,

                // HU-13: devolver las horas registradas.
                horas_ordinarias: planilla.horas_ordinarias,
                horas_extras: planilla.horas_extras,
                periodo_pago: planilla.periodo_pago,
                deducciones_legales: planilla.deducciones_legales,
                descuentos_totales: planilla.descuentos_totales,
                descuentos: detalleDescuentos || [],
                total_pagar: planilla.total_pagar,

                // HU-18: formato de docs/contrato-integracion-sprint3.md.
                novedades: (novedades || []).map(novedad => ({
                    ...novedad,
                    dias: contarDias(novedad.fecha_inicio, novedad.fecha_fin)
                })),
                dias_remunerados: planilla.dias_remunerados
            }
        });

    } catch (error) {
        console.error("Error al consultar la planilla:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "No se pudo consultar la planilla"
        });
    }
});

// HU-22: rutas de importación CSV.
const crearRutasImportacion = require("./routes/importacion");

app.use(
    "/api/planillas",
    crearRutasImportacion({
        supabase,
        verificarToken,
        verificarRolNomina
    })
);

//
// HU-23: VALIDACIÓN DE BORRADORES
//

function validarContenidoBorrador(contenido) {
    const errores = {};

    if (
        !contenido ||
        typeof contenido !== "object" ||
        Array.isArray(contenido)
    ) {
        return {
            valido: false,
            errores: {
                contenido: "El contenido del borrador debe ser un objeto"
            }
        };
    }

    if (
        !contenido.plantilla ||
        !esUUIDValido(contenido.plantilla.id)
    ) {
        errores.plantilla =
            "Debe seleccionar una plantilla válida";
    }

    if (
        contenido.empleado?.id &&
        !esUUIDValido(contenido.empleado.id)
    ) {
        errores.empleado =
            "El identificador del empleado no es válido";
    }

    const mes = contenido.mes;

    if (
        mes !== undefined &&
        mes !== null &&
        mes !== "" &&
        (
            !Number.isInteger(Number(mes)) ||
            Number(mes) < 1 ||
            Number(mes) > 12
        )
    ) {
        errores.mes = "Seleccione un mes válido";
    }

    const anio = contenido.anio;

    if (
        anio !== undefined &&
        anio !== null &&
        anio !== "" &&
        !/^[1-9]\d{3}$/.test(String(anio))
    ) {
        errores.anio = "Ingrese un año de cuatro cifras";
    }

    if (
        contenido.periodo_pago !== undefined &&
        contenido.periodo_pago !== "" &&
        !["mensual", "quincenal", "semanal"].includes(
            contenido.periodo_pago
        )
    ) {
        errores.periodo_pago =
            "Seleccione una frecuencia válida";
    }

    const camposNumericos = [
        "salario_base",
        "ingresos_adicionales",
        "horas_ordinarias",
        "horas_extras"
    ];

    for (const campo of camposNumericos) {
        const valor = contenido[campo];

        if (
            valor === undefined ||
            valor === null ||
            valor === ""
        ) {
            continue;
        }

        if (
            !/^\d+(?:\.\d{1,2})?$/.test(String(valor)) ||
            Number(valor) > 9999999999.99
        ) {
            errores[campo] =
                "Ingrese un valor válido con máximo dos decimales";
        }
    }

    for (const campo of ["ingresos", "descuentos", "novedades"]) {
        if (
            contenido[campo] !== undefined &&
            !Array.isArray(contenido[campo])
        ) {
            errores[campo] =
                `El campo ${campo} debe contener una lista`;
        }
    }

    return {
        valido: Object.keys(errores).length === 0,
        errores
    };
}


//
// HU-23: ENDPOINTS DE BORRADORES
//

// Crear borrador
app.post(
    "/api/borradores",
    verificarToken,
    verificarRolNomina,
    async (req, res) => {
        try {
            const contenido = req.body?.contenido;
            const validacion = validarContenidoBorrador(contenido);

            if (!validacion.valido) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Corrija los datos del borrador",
                    errores: validacion.errores
                });
            }

            const plantillaId = contenido.plantilla.id;
            const empleadoId = contenido.empleado?.id || null;

            const { data: plantilla, error: errorPlantilla } =
                await supabase
                    .from("plantillas")
                    .select("id")
                    .eq("id", plantillaId)
                    .maybeSingle();

            if (errorPlantilla) throw errorPlantilla;

            if (!plantilla) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "La plantilla seleccionada no existe"
                });
            }

            if (empleadoId) {
                const { data: empleado, error: errorEmpleado } =
                    await supabase
                        .from("empleados")
                        .select("id")
                        .eq("id", empleadoId)
                        .maybeSingle();

                if (errorEmpleado) throw errorEmpleado;

                if (!empleado) {
                    return res.status(404).json({
                        ok: false,
                        mensaje: "El empleado seleccionado no existe"
                    });
                }
            }

            const { data, error } = await supabase
                .from("planilla_borradores")
                .insert({
                    propietario_id: req.usuario.id,
                    plantilla_id: plantillaId,
                    empleado_id: empleadoId,
                    contenido,
                    estado: "Borrador"
                })
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({
                ok: true,
                mensaje: "Borrador guardado correctamente",
                borrador: data
            });
        } catch (error) {
            console.error("Error al crear borrador:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo guardar el borrador"
            });
        }
    }
);

// Listar únicamente los borradores del usuario
app.get(
    "/api/borradores",
    verificarToken,
    verificarRolNomina,
    async (req, res) => {
        try {
            const { data, error } = await supabase
                .from("planilla_borradores")
                .select(
                    "id, plantilla_id, empleado_id, contenido, estado, creado_en, actualizado_en"
                )
                .eq("propietario_id", req.usuario.id)
                .eq("estado", "Borrador")
                .order("actualizado_en", { ascending: false });

            if (error) throw error;

            return res.status(200).json({
                ok: true,
                borradores: data ?? []
            });
        } catch (error) {
            console.error("Error al listar borradores:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudieron consultar los borradores"
            });
        }
    }
);

// Recuperar un borrador del usuario
app.get(
    "/api/borradores/:id",
    verificarToken,
    verificarRolNomina,
    async (req, res) => {
        try {
            if (!esUUIDValido(req.params.id)) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Identificador de borrador inválido"
                });
            }

            const { data, error } = await supabase
                .from("planilla_borradores")
                .select("*")
                .eq("id", req.params.id)
                .eq("propietario_id", req.usuario.id)
                .eq("estado", "Borrador")
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "Borrador no encontrado"
                });
            }

            return res.status(200).json({
                ok: true,
                borrador: data
            });
        } catch (error) {
            console.error("Error al recuperar borrador:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo recuperar el borrador"
            });
        }
    }
);

// Actualizar un borrador existente
app.put(
    "/api/borradores/:id",
    verificarToken,
    verificarRolNomina,
    async (req, res) => {
        try {
            if (!esUUIDValido(req.params.id)) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Identificador de borrador inválido"
                });
            }

            const contenido = req.body?.contenido;
            const validacion = validarContenidoBorrador(contenido);

            if (!validacion.valido) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Corrija los datos del borrador",
                    errores: validacion.errores
                });
            }

            const { data: existente, error: errorConsulta } =
                await supabase
                    .from("planilla_borradores")
                    .select("id")
                    .eq("id", req.params.id)
                    .eq("propietario_id", req.usuario.id)
                    .eq("estado", "Borrador")
                    .maybeSingle();

            if (errorConsulta) throw errorConsulta;

            if (!existente) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "Borrador no encontrado o finalizado"
                });
            }

            const { data, error } = await supabase
                .from("planilla_borradores")
                .update({
                    plantilla_id: contenido.plantilla.id,
                    empleado_id: contenido.empleado?.id || null,
                    contenido,
                    actualizado_en: new Date().toISOString()
                })
                .eq("id", req.params.id)
                .eq("propietario_id", req.usuario.id)
                .eq("estado", "Borrador")
                .select()
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "Borrador no encontrado o finalizado"
                });
            }

            return res.status(200).json({
                ok: true,
                mensaje: "Borrador actualizado correctamente",
                borrador: data
            });
        } catch (error) {
            console.error("Error al actualizar borrador:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo actualizar el borrador"
            });
        }
    }
);

// HU-23: finalizar un borrador utilizando las validaciones
// y los cálculos existentes de la planilla definitiva.
app.post(
    "/api/borradores/:id/finalizar",
    verificarToken,
    verificarRolNomina,
    async (req, res, next) => {
        if (!esUUIDValido(req.params.id)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Identificador de borrador inválido"
            });
        }

        if (req.body?.confirmar_revision !== true) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe confirmar la revisión de la planilla"
            });
        }

        try {
            const { data: borrador, error } = await supabase
                .from("planilla_borradores")
                .select("*")
                .eq("id", req.params.id)
                .eq("propietario_id", req.usuario.id)
                .maybeSingle();

            if (error) throw error;

            if (!borrador) {
                return res.status(404).json({
                    ok: false,
                    mensaje: "Borrador no encontrado"
                });
            }

            if (borrador.estado !== "Borrador") {
                return res.status(409).json({
                    ok: false,
                    mensaje: "El borrador ya fue finalizado"
                });
            }

            const contenido = borrador.contenido;

            if (!contenido || typeof contenido !== "object" ||
                Array.isArray(contenido)) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "El contenido del borrador es inválido"
                });
            }

            const datos = prepararDatosDesdeBorrador(contenido);

            if (
                (datos.plantilla_id ?? null) !== (borrador.plantilla_id ?? null) ||
                (datos.empleado_id ?? null) !== (borrador.empleado_id ?? null)
            ) {
                return res.status(400).json({
                    ok: false,
                    mensaje: "Los datos no corresponden al borrador"
                });
            }

            req.body = datos;
            req.borradorFinalizacion = borrador;
            return next();
        } catch (error) {
            console.error("Error al recuperar borrador:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo recuperar el borrador"
            });
        }
    },
    validarDatosPlanilla,
    async (req, res) => {
        try {
            const datos = req.planillaValidada;

            const referencias = await verificarReferenciasPlanilla(datos);

            if (referencias.error) {
                const { estado, ...respuesta } = referencias.error;

                return res.status(estado).json({
                    ok: false,
                    ...respuesta
                });
            }

            const { empleado, plantilla } = referencias;

            const registro = construirRegistroPlanilla(
                datos,
                empleado,
                plantilla
            );

            const { data: resultado, error } = await supabase.rpc(
                "finalizar_borrador_validado",
                {
                    p_borrador_id: req.borradorFinalizacion.id,
                    p_propietario_id: req.usuario.id,
                    p_registro: registro,
                    p_descuentos: datos.descuentos,
                    p_novedades: datos.novedades,
                    p_ingresos: datos.ingresos_detalle ?? []
                }
            );

            if (error) throw error;

            const planilla = resultado?.[0];

            if (!planilla?.id) {
                throw new Error(
                    "La finalización no devolvió una planilla"
                );
            }

            return res.status(201).json({
                ok: true,
                mensaje: "Borrador finalizado correctamente",
                id: planilla.id,
                borrador_id: req.borradorFinalizacion.id,
                total_pagar: planilla.total_pagar
            });
        } catch (error) {
            console.error("Error al finalizar borrador:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudo finalizar el borrador"
            });
        }
    }
);

//
// HU-01: RESPUESTA COMPARTIDA PARA RUTAS NO ENCONTRADAS
//

app.use((req, res) => {
    return respuestaError(res, "Ruta no encontrada", 404);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});
