
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const prepararMovimientosPDF =
    require("../js/exportacion-movimientos-pdf.js");

// Simula la separación existente de descuentos legales y manuales.
function separarDescuentos(descuentos, deduccionesLegales) {
    const pendientes = (deduccionesLegales?.detalle || [])
        .filter(item => Number(item.importe) > 0)
        .map(item => ({
            concepto: item.nombre,
            centavos: Math.round(Number(item.importe) * 100)
        }));

    return descuentos.filter(descuento => {
        const indice = pendientes.findIndex(item =>
            item.concepto === descuento.concepto &&
            item.centavos === Math.round(Number(descuento.importe) * 100)
        );

        if (indice === -1) return true;

        pendientes.splice(indice, 1);
        return false;
    });
}

function crearPlanilla() {
    return {
        ingresos_adicionales: 150,
        ingresos_detalle: [
            { tipo: "Bono", concepto: "Productividad", origen: "Manual", importe: 150 }
        ],
        deducciones_legales: {
            periodo_pago: "Mensual",
            total: 65,
            detalle: [
                { nombre: "ISSS", base: 1000, tasa: 3, importe: 30 },
                { nombre: "AFP", base: 1000, tasa: 7.25, importe: 35 }
            ]
        },
        descuentos: [
            { concepto: "ISSS", importe: 30 },
            { concepto: "AFP", importe: 35 },
            { concepto: "Préstamo", importe: 25.5 }
        ],
        descuentos_totales: 90.5,
        novedades: [
            {
                tipo: "Permiso",
                fecha_inicio: "2026-10-01",
                fecha_fin: "2026-10-02",
                condicion_pago: "Con goce",
                dias: 2
            }
        ]
    };
}

test("HU-30: prepara las cuatro secciones del PDF", () => {
    const secciones = prepararMovimientosPDF(crearPlanilla(), separarDescuentos);

    assert.deepEqual(
        secciones.map(seccion => seccion.nombre),
        ["Ingresos", "Deducciones legales", "Descuentos manuales", "Novedades"]
    );
});

test("HU-30: conserva los ingresos históricos con dos decimales", () => {
    const secciones = prepararMovimientosPDF(crearPlanilla(), separarDescuentos);

    assert.deepEqual(secciones[0].filas, [
        ["Bono", "Productividad", "Manual", "150.00"]
    ]);
});

test("HU-30: presenta las deducciones legales históricas", () => {
    const secciones = prepararMovimientosPDF(crearPlanilla(), separarDescuentos);

    assert.deepEqual(secciones[1].filas, [
        ["ISSS", "1000.00", "3 %", "30.00"],
        ["AFP", "1000.00", "7.25 %", "35.00"]
    ]);
});

test("HU-30: no duplica las deducciones legales en descuentos manuales", () => {
    const secciones = prepararMovimientosPDF(crearPlanilla(), separarDescuentos);

    assert.deepEqual(secciones[2].filas, [
        ["Préstamo", "25.50"]
    ]);
});

test("HU-30: conserva las novedades del registro", () => {
    const secciones = prepararMovimientosPDF(crearPlanilla(), separarDescuentos);

    assert.deepEqual(secciones[3].filas, [
        ["Permiso", "2026-10-01", "2026-10-02", "Con goce", 2]
    ]);
});

test("HU-30: identifica los detalles históricos ausentes", () => {
    const secciones = prepararMovimientosPDF({
        ingresos_adicionales: 100,
        descuentos_totales: 50
    }, separarDescuentos);

    for (const seccion of secciones) {
        assert.deepEqual(seccion.filas, [["Detalle no registrado"]]);
    }
});

test("HU-30: distingue la ausencia de movimientos", () => {
    const secciones = prepararMovimientosPDF({
        ingresos_adicionales: 0,
        ingresos_detalle: [],
        deducciones_legales: { detalle: [], total: 0 },
        descuentos: [],
        descuentos_totales: 0,
        novedades: []
    }, separarDescuentos);

    for (const seccion of secciones) {
        assert.deepEqual(seccion.filas, [["Sin movimientos"]]);
    }
});

test("HU-30: no modifica los datos históricos", () => {
    const planilla = crearPlanilla();
    const original = structuredClone(planilla);

    prepararMovimientosPDF(planilla, separarDescuentos);

    assert.deepEqual(planilla, original);
});

test("HU-30: rechaza datos de entrada inválidos", () => {
    assert.throws(
        () => prepararMovimientosPDF(null, separarDescuentos),
        TypeError
    );

    assert.throws(
        () => prepararMovimientosPDF(crearPlanilla(), null),
        TypeError
    );
});
