// ARCHIVO: Pruebas del nombre de los archivos PDF y Excel
// Buscar: pruebas nombre archivo, HU-30, HU-31

"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ReglasNomina = require("../js/reglas-nomina.js");

const ruta = path.join(__dirname, "../js/detalle-planilla.js");
const codigo = fs.readFileSync(ruta, "utf8");

const contexto = {
    ReglasNomina,
    document: {
        addEventListener() {}
    }
};

contexto.window = contexto;
vm.runInNewContext(codigo, contexto);

const nombreExportacion = contexto.nombreExportacion;

const planilla = {
    id: "f1bde4f5-1480-4c5f-9623-6b8c447ba3fb",
    codigo: "EMP001",
    periodo: "Octubre 2026"
};

test("HU-30: forma el nombre del PDF con código, período e identificador", () => {
    assert.equal(
        nombreExportacion(planilla, "pdf"),
        "planilla_EMP001_2026-10_f1bde4f5-1480-4c5f-9623-6b8c447ba3fb.pdf"
    );
});

test("HU-31: utiliza el mismo nombre para el Excel", () => {
    assert.equal(
        nombreExportacion(planilla, "xlsx"),
        "planilla_EMP001_2026-10_f1bde4f5-1480-4c5f-9623-6b8c447ba3fb.xlsx"
    );
});

test("HU-31: escribe el mes con dos cifras", () => {
    assert.equal(
        nombreExportacion({ ...planilla, periodo: "Enero 2027" }, "xlsx"),
        "planilla_EMP001_2027-01_f1bde4f5-1480-4c5f-9623-6b8c447ba3fb.xlsx"
    );
    assert.equal(
        nombreExportacion({ ...planilla, periodo: "Diciembre 2026" }, "xlsx"),
        "planilla_EMP001_2026-12_f1bde4f5-1480-4c5f-9623-6b8c447ba3fb.xlsx"
    );
});
