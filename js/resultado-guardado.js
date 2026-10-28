const FORMATO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validarResultadoGuardado(resultado) {
    if (
        !resultado ||
        resultado.ok !== true ||
        typeof resultado.id !== "string" ||
        !FORMATO_UUID.test(resultado.id)
    ) {
        throw new Error(
            "No se pudo confirmar el guardado: la respuesta no contiene un identificador válido."
        );
    }

    return resultado;
}