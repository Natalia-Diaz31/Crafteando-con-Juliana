const test = require("node:test");
const assert = require("node:assert/strict");

const {
    validarNovedades,
    contarDias
} = require("../api_/utils/validar-novedades");

const PERIODO = {
    mes: 10,
    anio: 2026,
    frecuencia: "mensual"
};

function novedad(
    fechaInicio,
    fechaFin,
    condicion = "Sin goce",
    tipo = "Ausencia"
) {
    return { tipo, condicion, fechaInicio, fechaFin };
}

test("HU-18: sin novedades se remuneran 30 días", () => {
    const resultado = validarNovedades([], PERIODO);

    assert.equal(resultado.valido, true);
    assert.equal(resultado.diasRemunerados, 30);
    assert.deepEqual(resultado.novedades, []);
});

test("HU-18: el conteo incluye el primer y último día", () => {
    assert.equal(contarDias("2026-10-03", "2026-10-05"), 3);
    assert.equal(contarDias("2026-10-10", "2026-10-10"), 1);
});

test("HU-18: las novedades sin goce reducen los días remunerados", () => {
    const resultado = validarNovedades([
        novedad("2026-10-03", "2026-10-05")
    ], PERIODO);

    assert.equal(resultado.valido, true);
    assert.equal(resultado.diasRemunerados, 27);
});

test("HU-18: las novedades con goce no reducen los días", () => {
    const resultado = validarNovedades([
        novedad("2026-10-03", "2026-10-05", "Con goce", "Permiso")
    ], PERIODO);

    assert.equal(resultado.valido, true);
    assert.equal(resultado.diasRemunerados, 30);
});

test("HU-18: combina novedades con goce y sin goce", () => {
    const resultado = validarNovedades([
        novedad("2026-10-03", "2026-10-04"),
        novedad("2026-10-10", "2026-10-12", "Con goce", "Incapacidad"),
        novedad("2026-10-20", "2026-10-20")
    ], PERIODO);

    assert.equal(resultado.valido, true);
    assert.equal(resultado.diasRemunerados, 27);
});

test("HU-18: rechaza fechas superpuestas", () => {
    const resultado = validarNovedades([
        novedad("2026-10-03", "2026-10-05"),
        novedad("2026-10-05", "2026-10-07")
    ], PERIODO);

    assert.equal(resultado.valido, false);
    assert.match(resultado.errores.join(" "), /Las fechas se superponen con otra novedad/);
});

test("HU-18: permite novedades consecutivas sin superposición", () => {
    const resultado = validarNovedades([
        novedad("2026-10-03", "2026-10-05"),
        novedad("2026-10-06", "2026-10-07")
    ], PERIODO);

    assert.equal(resultado.valido, true);
    assert.equal(resultado.diasRemunerados, 25);
});

test("HU-18: rechaza fechas fuera del período", () => {
    const resultado = validarNovedades([
        novedad("2026-09-30", "2026-10-02")
    ], PERIODO);

    assert.equal(resultado.valido, false);
    assert.match(resultado.errores.join(" "), /Las fechas deben pertenecer al mes y año/);
});

test("HU-18: rechaza fecha final anterior a la inicial", () => {
    const resultado = validarNovedades([
        novedad("2026-10-10", "2026-10-09")
    ], PERIODO);

    assert.equal(resultado.valido, false);
    assert.match(resultado.errores.join(" "), /La fecha de finalización no puede ser anterior/);
});

test("HU-18: rechaza fechas inexistentes", () => {
    const resultado = validarNovedades([
        novedad("2026-10-32", "2026-10-32")
    ], PERIODO);

    assert.equal(resultado.valido, false);
    assert.match(resultado.errores.join(" "), /Ingrese una fecha válida/);
});

test("HU-18: rechaza tipos de novedad inválidos", () => {
    const resultado = validarNovedades([
        novedad("2026-10-03", "2026-10-04", "Sin goce", "Vacaciones")
    ], PERIODO);

    assert.equal(resultado.valido, false);
    assert.match(resultado.errores.join(" "), /Seleccione un tipo de novedad válido/);
});

test("HU-18: rechaza condiciones de pago inválidas", () => {
    const resultado = validarNovedades([
        novedad("2026-10-03", "2026-10-04", "Pago parcial")
    ], PERIODO);

    assert.equal(resultado.valido, false);
    assert.match(resultado.errores.join(" "), /Seleccione la condición de pago/);
});

test("HU-18: rechaza más de 30 días sin goce", () => {
    const resultado = validarNovedades([
        novedad("2026-10-01", "2026-10-31")
    ], PERIODO);

    assert.equal(resultado.valido, false);
    assert.match(resultado.errores.join(" "), /Los días sin goce no pueden superar 30/);
});

test("HU-18: rechaza novedades cuando la frecuencia no es mensual", () => {
    const resultado = validarNovedades([
        novedad("2026-10-03", "2026-10-04")
    ], { ...PERIODO, frecuencia: "quincenal" });

    assert.equal(resultado.valido, false);
});

test("HU-18: convierte los campos al formato de Supabase", () => {
    const resultado = validarNovedades([
        novedad("2026-10-03", "2026-10-04")
    ], PERIODO);

    assert.deepEqual(resultado.novedades, [{
        tipo: "Ausencia",
        fecha_inicio: "2026-10-03",
        fecha_fin: "2026-10-04",
        condicion_pago: "Sin goce"
    }]);
});

test("HU-18: rechaza una lista de novedades inválida", () => {
    const resultado = validarNovedades(null, PERIODO);

    assert.equal(resultado.valido, false);
    assert.equal(resultado.diasRemunerados, null);
});