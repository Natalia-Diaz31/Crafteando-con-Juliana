
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
    validarPlanillaDefinitiva
} = require("../api_/utils/validar-planilla-definitiva");

const ReglasNomina = require("../api_/utils/reglas-nomina");

const EMPLEADO_ID = "11111111-1111-4111-8111-111111111111";
const PLANTILLA_ID = "22222222-2222-4222-8222-222222222222";

function crearPlanilla(cambios = {}) {
    return {
        novedades: [],
        periodo_pago: "mensual",
        version_regla: ReglasNomina.VERSION,
        empleado_id: EMPLEADO_ID,
        plantilla_id: PLANTILLA_ID,
        mes: 10,
        anio: 2026,
        salario_base: "500.00",
        ingresos_adicionales: "50.00",
        horas_ordinarias: "160.00",
        horas_extras: "8.00",
        descuentos: [
            { concepto: "Préstamo", importe: "10.00" },
            { concepto: "Anticipo", importe: "15.00" }
        ],
        ...cambios
    };
}

test("HU-33: valida una planilla por horas", () => {
    const resultado = validarPlanillaDefinitiva(crearPlanilla());

    assert.equal(resultado.valido, true);
    assert.deepEqual(resultado.errores, {});

    const planilla = resultado.planillaValidada;

    assert.equal(planilla.modo_calculo, "horas");
    assert.equal(planilla.salario_base, "500.00");
    assert.equal(planilla.horas_ordinarias, "160.00");
    assert.equal(planilla.horas_extras, "8.00");
    assert.equal(planilla.ingresos_adicionales, "50.00");
    assert.equal(planilla.salario_base_mensual, null);
    assert.equal(planilla.salario_proporcional, null);
});

test("HU-33: valida una planilla por días", () => {
    const datos = crearPlanilla({
        modo_calculo: "dias",
        salario_base_mensual: "500.00",
        horas_ordinarias: null,
        horas_extras: null
    });

    const resultado = validarPlanillaDefinitiva(datos);

    assert.equal(resultado.valido, true);

    const planilla = resultado.planillaValidada;

    assert.equal(planilla.modo_calculo, "dias");
    assert.equal(planilla.salario_base_mensual, "500.00");
    assert.equal(planilla.dias_remunerados, 30);
    assert.equal(planilla.salario_proporcional, "500.00");
    assert.equal(planilla.horas_ordinarias, null);
    assert.equal(planilla.horas_extras, null);
});

test("HU-33: calcula el salario proporcional con novedades", () => {
    const datos = crearPlanilla({
        modo_calculo: "dias",
        salario_base_mensual: "600.00",
        novedades: [
            {
                tipo: "Ausencia",
                condicion: "Sin goce",
                fechaInicio: "2026-10-01",
                fechaFin: "2026-10-05"
            }
        ]
    });

    const resultado = validarPlanillaDefinitiva(datos);

    assert.equal(resultado.valido, true);
    assert.equal(resultado.planillaValidada.dias_remunerados, 25);
    assert.equal(
        resultado.planillaValidada.salario_proporcional,
        "500.00"
    );
});

test("HU-33: rechaza identificadores inválidos", () => {
    const resultado = validarPlanillaDefinitiva(
        crearPlanilla({
            empleado_id: "incorrecto",
            plantilla_id: "123"
        })
    );

    assert.equal(resultado.valido, false);
    assert.equal(resultado.planillaValidada, null);
    assert.ok(resultado.errores.empleado_id);
    assert.ok(resultado.errores.plantilla_id);
});

test("HU-33: rechaza novedades inválidas", () => {
    const resultado = validarPlanillaDefinitiva(
        crearPlanilla({
            novedades: [
                {
                    tipo: "Desconocido",
                    condicion: "Sin goce",
                    fechaInicio: "2026-10-01",
                    fechaFin: "2026-10-03"
                }
            ]
        })
    );

    assert.equal(resultado.valido, false);
    assert.equal(resultado.planillaValidada, null);
    assert.ok(resultado.errores.novedades);
});

test("HU-33: conserva los errores de ingresos", () => {
    const resultado = validarPlanillaDefinitiva(
        crearPlanilla({
            ingresos_adicionales: "abc"
        })
    );

    assert.equal(resultado.valido, false);
    assert.equal(resultado.planillaValidada, null);
    assert.ok(resultado.errores.ingresos_adicionales);
});

test("HU-33: conserva los errores de descuentos", () => {
    const resultado = validarPlanillaDefinitiva(
        crearPlanilla({
            descuentos: [
                { concepto: "ISSS", importe: "10.00" }
            ]
        })
    );

    assert.equal(resultado.valido, false);
    assert.equal(resultado.planillaValidada, null);
    assert.ok(resultado.errores["descuentos[0].concepto"]);
});

test("HU-33: rechaza versiones desactualizadas", () => {
    const resultado = validarPlanillaDefinitiva(
        crearPlanilla({
            version_regla: "version-antigua"
        })
    );

    assert.equal(resultado.valido, false);
    assert.equal(resultado.planillaValidada, null);
    assert.ok(resultado.errores.version_regla);
});

test("HU-33: no modifica los datos originales", () => {
    const datos = crearPlanilla({
        observaciones: "  Planilla de prueba  "
    });

    const resultado = validarPlanillaDefinitiva(datos);

    assert.equal(resultado.valido, true);
    assert.equal(
        resultado.planillaValidada.observaciones,
        "Planilla de prueba"
    );
    assert.equal(
        datos.observaciones,
        "  Planilla de prueba  "
    );
});
