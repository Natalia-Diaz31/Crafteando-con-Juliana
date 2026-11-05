// ARCHIVO: Formato común de las respuestas de la API
// Buscar: respuesta, json, error

// Qué hace: Responde con ok: true, mensaje y datos
// Buscar: respuestaExitosa
function respuestaExitosa(res, mensaje, datos = null, codigo = 200) {
    return res.status(codigo).json({
        ok: true,
        mensaje: mensaje,
        data: datos
    });
}

// Qué hace: Responde con ok: false y el mensaje de error
// Buscar: respuestaError
function respuestaError(res, mensaje, codigo = 500) {
    return res.status(codigo).json({
        ok: false,
        mensaje: mensaje
    });
}

module.exports = {
    respuestaExitosa,
    respuestaError
};