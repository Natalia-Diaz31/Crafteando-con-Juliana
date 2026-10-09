function respuestaExitosa(res, mensaje, datos = null, codigo = 200) {
    return res.status(codigo).json({
        ok: true,
        mensaje: mensaje,
        data: datos
    });
}

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