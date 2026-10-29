
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { resolve } = require("node:path");

const apiRequire = createRequire(
    resolve(__dirname, "../api_/server.js")
);

const express = apiRequire("express");

const crearRutasComparacion =
    require("../api_/routes/comparacion-planillas");

const EMPLEADO_ID = "11111111-1111-4111-8111-111111111111";

const PLANILLA_ANTERIOR = {
    id: "33333333-3333-4333-8333-333333333333",
    empleado_id: EMPLEADO_ID,
    anio: 2026,
    mes: 9,
    periodo_pago: "mensual",
    fecha_guardado: "2026-09-30T12:00:00Z",
    salario_base: "900.00",
    ingresos_adicionales: "100.00",
    deducciones_legales: { total: "100.00", detalle: [] },
    descuentos_totales: "150.00",
    total_pagar: "850.00"
};

async function prepararServidor({
    planilla = PLANILLA_ANTERIOR,
    error = null,
    autorizado = true
} = {}) {
    const consultas = [];
    const app = express();

    const verificarToken = (req, res, next) => {
        if (!req.headers.authorization) {
            return res.status(401).json({
                ok: false,
                mensaje: "No autorizado"
            });
        }
        next();
    };

    const verificarRolNomina = (req, res, next) => {
        if (!autorizado) {
            return res.status(403).json({
                ok: false,
                mensaje: "Acceso denegado"
            });
        }
        next();
    };

    const servicio = {
        async consultarPlanillaAnterior(parametros) {
            consultas.push(parametros);
            if (error) throw error;
            return planilla;
        }
    };

    app.use(
        "/api/planillas",
        crearRutasComparacion({
            servicio,
            verificarToken,
            verificarRolNomina,
            formatearPeriodo: (mes, anio) => `${mes}/${anio}`
        })
    );

    const servidor = app.listen(0);

    await new Promise(resolve => {
        if (servidor.listening) resolve();
        else servidor.once("listening", resolve);
    });

    const direccion = `http://127.0.0.1:${servidor.address().port}`;

    return {
        consultas,
        async consultar(query = "", token = "Bearer prueba") {
            const respuesta = await fetch(
                `${direccion}/api/planillas/comparacion-anterior${query}`,
                {
                    headers: token
                        ? { Authorization: token }
                        : {}
                }
            );

            return {
                status: respuesta.status,
                datos: await respuesta.json()
            };
        },
        cerrar() {
            return new Promise(resolve => servidor.close(resolve));
        }
    };
}

test("HU-28: devuelve los cuatro importes históricos", async () => {
    const api = await prepararServidor();

    try {
        const { status, datos } = await api.consultar(
            `?empleado_id=${EMPLEADO_ID}&anio=2026&mes=10`
        );

        assert.equal(status, 200);
        assert.equal(datos.ok, true);
        assert.equal(datos.comparable, true);
        assert.equal(datos.anterior.id, PLANILLA_ANTERIOR.id);
        assert.equal(datos.anterior.periodo, "9/2026");

        assert.deepEqual(datos.anterior.importes, {
            totalIngresos: "1000.00",
            deduccionesLegales: "100.00",
            descuentosManuales: "50.00",
            totalPagar: "850.00"
        });

        assert.deepEqual(api.consultas[0], {
            empleadoId: EMPLEADO_ID,
            anio: 2026,
            mes: 10
        });
    } finally {
        await api.cerrar();
    }
});

test("HU-28: rechaza identificadores inválidos", async () => {
    const api = await prepararServidor();

    try {
        const { status, datos } = await api.consultar(
            "?empleado_id=invalido&anio=2026&mes=10"
        );

        assert.equal(status, 400);
        assert.equal(datos.ok, false);
        assert.equal(api.consultas.length, 0);
    } finally {
        await api.cerrar();
    }
});

test("HU-28: rechaza meses y años inválidos", async () => {
    const api = await prepararServidor();

    try {
        for (const periodo of [
            "anio=2026&mes=13",
            "anio=2026&mes=0",
            "anio=abc&mes=10",
            "anio=1800&mes=10"
        ]) {
            const { status } = await api.consultar(
                `?empleado_id=${EMPLEADO_ID}&${periodo}`
            );

            assert.equal(status, 400);
        }

        assert.equal(api.consultas.length, 0);
    } finally {
        await api.cerrar();
    }
});

test("HU-28: exige autenticación", async () => {
    const api = await prepararServidor();

    try {
        const { status } = await api.consultar(
            `?empleado_id=${EMPLEADO_ID}&anio=2026&mes=10`,
            null
        );

        assert.equal(status, 401);
        assert.equal(api.consultas.length, 0);
    } finally {
        await api.cerrar();
    }
});

test("HU-28: exige el rol autorizado", async () => {
    const api = await prepararServidor({ autorizado: false });

    try {
        const { status } = await api.consultar(
            `?empleado_id=${EMPLEADO_ID}&anio=2026&mes=10`
        );

        assert.equal(status, 403);
        assert.equal(api.consultas.length, 0);
    } finally {
        await api.cerrar();
    }
});

test("HU-28: informa cuando no existe planilla anterior", async () => {
    const api = await prepararServidor({ planilla: null });

    try {
        const { datos } = await api.consultar(
            `?empleado_id=${EMPLEADO_ID}&anio=2026&mes=10`
        );

        assert.equal(datos.ok, true);
        assert.equal(datos.comparable, false);
        assert.equal(
            datos.mensaje,
            "No hay una planilla anterior comparable"
        );
        assert.ok(datos.motivo);
    } finally {
        await api.cerrar();
    }
});

test("HU-28: detecta importes históricos incompletos", async () => {
    const api = await prepararServidor({
        planilla: {
            ...PLANILLA_ANTERIOR,
            deducciones_legales: null
        }
    });

    try {
        const { datos } = await api.consultar(
            `?empleado_id=${EMPLEADO_ID}&anio=2026&mes=10`
        );

        assert.equal(datos.ok, true);
        assert.equal(datos.comparable, false);
        assert.ok(datos.motivo);
    } finally {
        await api.cerrar();
    }
});

test("HU-28: rechaza subtotales históricos inconsistentes", async () => {
    const api = await prepararServidor({
        planilla: {
            ...PLANILLA_ANTERIOR,
            descuentos_totales: "50.00"
        }
    });

    try {
        const { datos } = await api.consultar(
            `?empleado_id=${EMPLEADO_ID}&anio=2026&mes=10`
        );

        assert.equal(datos.ok, true);
        assert.equal(datos.comparable, false);
    } finally {
        await api.cerrar();
    }
});

test("HU-28: informa errores de consulta", async () => {
    const api = await prepararServidor({
        error: new Error("Error simulado de base de datos")
    });

    try {
        const { status, datos } = await api.consultar(
            `?empleado_id=${EMPLEADO_ID}&anio=2026&mes=10`
        );

        assert.equal(status, 500);
        assert.equal(datos.ok, false);
        assert.match(datos.mensaje, /Intente nuevamente/);
    } finally {
        await api.cerrar();
    }
});

test("HU-28: no modifica los datos históricos", async () => {
    const original = structuredClone(PLANILLA_ANTERIOR);
    const api = await prepararServidor({
        planilla: PLANILLA_ANTERIOR
    });

    try {
        await api.consultar(
            `?empleado_id=${EMPLEADO_ID}&anio=2026&mes=10`
        );

        assert.deepEqual(PLANILLA_ANTERIOR, original);
    } finally {
        await api.cerrar();
    }
});
