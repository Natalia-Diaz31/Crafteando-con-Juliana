// ARCHIVO: Middlewares que validan el cuerpo de una planilla antes de guardarla
// Buscar: validación, middleware, guardar

"use strict";

const { esUUIDValido } = require("../utils/validar-uuid");
const { validarPlanillaDefinitiva } = require("../utils/validar-planilla-definitiva");

// HU-33: la ruta de guardado y la finalización de borradores usan la misma
// validación definitiva; aquí solo se traduce su resultado a HTTP.
// Qué hace: Valida la planilla con validarPlanillaDefinitiva y responde 400 con los errores
// Buscar: validarDatosPlanilla, 400, errores
function validarDatosPlanilla(req, res, next) {
    const { valido, errores, planillaValidada } =
        validarPlanillaDefinitiva(req.body);

    if (!valido) {
        return res.status(400).json({
            ok: false,
            mensaje: "Corrija los datos de la planilla",
            errores
        });
    }

    req.planillaValidada = planillaValidada;
    return next();
}

// HU-17: validar el identificador de cada operación de guardado.
// Qué hace: Exige un operacion_id válido para evitar guardados duplicados
// Buscar: operacion_id, idempotencia, HU-17
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

module.exports = { validarDatosPlanilla, validarIdentificadorOperacion };
