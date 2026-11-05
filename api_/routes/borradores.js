// ARCHIVO: Rutas para crear, listar, abrir, actualizar y finalizar borradores
// Buscar: borradores, HU-23

"use strict";

const express = require("express");
const { esUUIDValido } = require("../utils/validar-uuid");
const { validarContenidoBorrador } = require("../utils/validar-borrador");
const { prepararDatosDesdeBorrador, construirRegistroPlanilla } = require("../utils/registro-planilla");
const { validarDatosPlanilla } = require("../middlewares/validar-planilla");

// HU-23: crear, listar, recuperar, actualizar y finalizar borradores.
// Qué hace: Crea el router de borradores
// Buscar: crearRutasBorradores
function crearRutasBorradores({ supabase, verificarToken, verificarRolNomina, verificarReferenciasPlanilla }) {
    const router = express.Router();

    // Crear borrador
    // Qué hace: Crea un borrador nuevo de la cuenta
    // Buscar: crear borrador, POST borradores
    router.post(
        "/",
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
    // Qué hace: Lista los borradores pendientes de la cuenta
    // Buscar: listar borradores, GET borradores
    router.get(
        "/",
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
    // Qué hace: Devuelve un borrador de la cuenta por su id
    // Buscar: abrir borrador, recuperar
    router.get(
        "/:id",
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
    // Qué hace: Actualiza el contenido de un borrador existente
    // Buscar: actualizar borrador, PUT
    router.put(
        "/:id",
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
    // Qué hace: Convierte el borrador en planilla definitiva con todas las validaciones
    // Buscar: finalizar borrador, finalizar_borrador_validado
    router.post(
        "/:id/finalizar",
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

    return router;
}

module.exports = crearRutasBorradores;
