"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const preparar = require("../js/exportacion-datos-generales");

const detalle = {
    id: "planilla-1",
    fecha_guardado: "2026-10-21T02:14:00Z",
    plantilla: "Mensual",
    periodo: "Septiembre 2026",
    periodo_pago: "mensual",
    codigo: "EMP002",
    nombre_completo: "Carlos Hernández",
    dui: "00000000-0",
    cargo: "Analista",
    tipo_contrato: "Plazo fijo",
    salario_base: "5000.00",
    ingresos_adicionales: "800.00",
    total_ingresos: "5800.00",
    descuentos_totales: "1822.49",
    total_pagar: "3977.51",
    horas_ordinarias: 0,
    horas_extras: 0,
    observaciones: "  Revisada  "
};

test("HU-30: identifica planilla, período y empleado", () => {
    const datos = preparar(detalle);

    assert.deepEqual(datos.identificacion, {
        id: "planilla-1",
        fecha_guardado: "2026-10-21T02:14:00Z",
        plantilla: "Mensual",
        periodo: "Septiembre 2026",
        periodo_pago: "mensual"
    });

    assert.equal(datos.empleado.nombre_completo, "Carlos Hernández");
    assert.equal(datos.empleado.codigo, "EMP002");
    assert.equal(datos.empleado.dui, "00000000-0");
    assert.equal(datos.empleado.cargo, "Analista");
    assert.equal(datos.empleado.tipo_contrato, "Plazo fijo");
});

test("HU-30: conserva importes históricos y ceros", () => {
    const datos = preparar(detalle).datos_salariales;

    assert.equal(datos.total_pagar, "3977.51");
    assert.equal(datos.ingresos_adicionales, "800.00");
    assert.equal(datos.total_ingresos, "5800.00");
    assert.equal(datos.horas_ordinarias, 0);
    assert.equal(datos.horas_extras, 0);
});

test("HU-30: identifica campos históricos ausentes", () => {
    const datos = preparar({
        id: "antigua",
        salario_base: 0
    });

    assert.equal(datos.empleado.tipo_contrato, "No registrado");
    assert.equal(
        datos.datos_salariales.salario_proporcional,
        "No registrado"
    );
    assert.equal(datos.datos_salariales.salario_base, 0);
    assert.equal(datos.observaciones, "No registrado");
});

test("HU-30: distingue observaciones vacías y ausentes", () => {
    assert.equal(
        preparar({ observaciones: "  " }).observaciones,
        "Sin observaciones"
    );

    assert.equal(
        preparar({ observaciones: null }).observaciones,
        "Sin observaciones"
    );

    assert.equal(preparar({}).observaciones, "No registrado");
    assert.equal(preparar(detalle).observaciones, "Revisada");
});

test("HU-30: no modifica los datos originales", () => {
    const original = { ...detalle };

    preparar(detalle);

    assert.deepEqual(detalle, original);
});

test("HU-30: rechaza entradas inválidas", () => {
    for (const valor of [null, undefined, [], "texto", 5]) {
        assert.throws(() => preparar(valor), TypeError);
    }
});
