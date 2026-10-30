
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
    celdaTexto,
    celdaImporte,
    celdaFecha,
    celdaDias,
    prepararLegalesNovedadesExcel
} = require("../js/exportacion-legales-novedades.js");

// HU-31: Deducciones legales

test("HU-31: prepara deducciones legales con importes numéricos", () => {
    const hojas = prepararLegalesNovedadesExcel({
        deducciones_legales: {
            detalle: [{
                nombre: "ISSS",
                base: "500.00",
                tasa: 3,
                importe: "15.00"
            }]
        },
        novedades: []
    });

    const hoja = hojas[0];

    assert.equal(hoja.nombre, "Deducciones legales");
    assert.equal(hoja.filas.length, 1);
    assert.deepEqual(hoja.filas[0][1], {
        t: "n",
        v: 500,
        z: "0.00"
    });
    assert.deepEqual(hoja.filas[0][3], {
        t: "n",
        v: 15,
        z: "0.00"
    });
});

test("HU-31: conserva una fila por deducción legal", () => {
    const hojas = prepararLegalesNovedadesExcel({
        deducciones_legales: {
            detalle: [
                { nombre: "ISSS", base: 500, importe: 15 },
                { nombre: "AFP", base: 500, importe: 36.25 }
            ]
        },
        novedades: []
    });

    assert.equal(hojas[0].filas.length, 2);
    assert.equal(hojas[0].filas[0][0].v, "ISSS");
    assert.equal(hojas[0].filas[1][0].v, "AFP");
});

test("HU-31: rechaza importes inválidos", () => {
    assert.throws(
        () => celdaImporte("importe incorrecto"),
        TypeError
    );
});

// HU-31: Novedades

test("HU-31: conserva fechas y días de novedades", () => {
    const hojas = prepararLegalesNovedadesExcel({
        deducciones_legales: { detalle: [] },
        novedades: [{
            tipo: "Incapacidad",
            fecha_inicio: "2026-10-05",
            fecha_fin: "2026-10-07",
            condicion_pago: "Con goce",
            dias: 3
        }]
    });

    const fila = hojas[1].filas[0];

    assert.equal(hojas[1].nombre, "Novedades");
    assert.deepEqual(fila[1], {
        t: "s",
        v: "2026-10-05"
    });
    assert.deepEqual(fila[2], {
        t: "s",
        v: "2026-10-07"
    });
    assert.deepEqual(fila[4], {
        t: "n",
        v: 3,
        z: "0.##"
    });
});

test("HU-31: conserva una fila por novedad", () => {
    const hojas = prepararLegalesNovedadesExcel({
        deducciones_legales: { detalle: [] },
        novedades: [
            { tipo: "Incapacidad", dias: 3 },
            { tipo: "Permiso", dias: 1 }
        ]
    });

    assert.equal(hojas[1].filas.length, 2);
});

// HU-31: Registros históricos

test("HU-31: identifica movimientos históricos sin desglose", () => {
    const hojas = prepararLegalesNovedadesExcel({
        descuentos_totales: 81.38
    });

    assert.equal(
        hojas[0].filas[0][0].v,
        "Detalle no registrado"
    );
    assert.equal(
        hojas[1].filas[0][0].v,
        "Detalle no registrado"
    );
});

test("HU-31: distingue ausencia de movimientos", () => {
    const hojas = prepararLegalesNovedadesExcel({
        deducciones_legales: { detalle: [] },
        novedades: []
    });

    assert.equal(hojas[0].filas[0][0].v, "Sin movimientos");
    assert.equal(hojas[1].filas[0][0].v, "Sin movimientos");
});

// HU-31: Tipos de celda y protección de textos

test("HU-31: protege textos que comienzan con caracteres especiales", () => {
    for (const valor of [
        "=SUMA(1,2)",
        "+123",
        "-001",
        "@usuario"
    ]) {
        assert.deepEqual(celdaTexto(valor), {
            t: "s",
            v: valor
        });
    }
});

test("HU-31: conserva ceros iniciales en códigos y DUI", () => {
    assert.equal(celdaTexto("000123").v, "000123");
    assert.equal(celdaTexto("01234567-8").v, "01234567-8");
});

test("HU-31: conserva fechas como texto", () => {
    assert.deepEqual(celdaFecha("2026-10-29"), {
        t: "s",
        v: "2026-10-29"
    });
});

test("HU-31: asigna formato numérico a importes y días", () => {
    assert.deepEqual(celdaImporte("25.50"), {
        t: "n",
        v: 25.5,
        z: "0.00"
    });

    assert.deepEqual(celdaDias("3"), {
        t: "n",
        v: 3,
        z: "0.##"
    });
});


test("HU-31: agrega las dos hojas al libro Excel", () => {
    const { agregarLegalesNovedadesAlLibro } =
        require("../js/exportacion-legales-novedades.js");

    const libro = { SheetNames: [], Sheets: {} };

    const XLSX = {
        utils: {
            aoa_to_sheet: filas => ({ filas }),
            book_append_sheet: (libro, hoja, nombre) => {
                libro.SheetNames.push(nombre);
                libro.Sheets[nombre] = hoja;
            }
        }
    };

    const planilla = {
        deducciones_legales: {
            detalle: [
                {
                    nombre: "ISSS",
                    base: 500,
                    tasa: 3,
                    importe: 15
                }
            ]
        },
        novedades: [
            {
                tipo: "Incapacidad",
                fecha_inicio: "2026-10-05",
                fecha_fin: "2026-10-07",
                condicion_pago: "Con goce",
                dias: 3
            }
        ]
    };

    const resultado = agregarLegalesNovedadesAlLibro(
        libro,
        planilla,
        XLSX
    );

    assert.equal(resultado, libro);

    assert.deepEqual(libro.SheetNames, [
        "Deducciones legales",
        "Novedades"
    ]);

    assert.equal(
        libro.Sheets["Deducciones legales"].filas[1][3].v,
        15
    );

    assert.equal(
        libro.Sheets["Novedades"].filas[1][4].v,
        3
    );
});
