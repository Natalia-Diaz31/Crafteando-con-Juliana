// ARCHIVO: Validación de identificadores UUID
// Buscar: uuid, id

// Validación reutilizable de identificadores UUID.

const FORMATO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Qué hace: Indica si un texto tiene formato de UUID
// Buscar: esUUIDValido
function esUUIDValido(valor) {
    return typeof valor === "string" &&
        FORMATO_UUID.test(valor);
}

module.exports = { esUUIDValido };