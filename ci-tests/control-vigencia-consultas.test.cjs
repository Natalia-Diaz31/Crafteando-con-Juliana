
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ruta = path.join(
    __dirname,
    "../js/control-vigencia-consultas.js"
);

// Cargamos el módulo para probarlo sin modificar
// la configuración actual del proyecto.
const codigo = fs.readFileSync(ruta, "utf8")
    .replace(
        "export function crearControlVigenciaConsultas",
        "function crearControlVigenciaConsultas"
    );

const contexto = vm.createContext({
    AbortController
});

vm.runInContext(
    `${codigo}\nthis.crearControl = crearControlVigenciaConsultas;`,
    contexto
);

const crearControl = contexto.crearControl;

test("inicia una consulta vigente", () => {
    const control = crearControl();
    const consulta = control.iniciarConsulta("pagina=1");

    assert.equal(control.estaVigente(consulta), true);
    assert.equal(consulta.controlador.signal.aborted, false);
});

test("reutiliza una consulta activa con la misma clave", () => {
    const control = crearControl();

    const primera = control.iniciarConsulta("pagina=1");
    const segunda = control.iniciarConsulta("pagina=1");

    assert.equal(primera, segunda);
    assert.equal(primera.controlador.signal.aborted, false);
});

test("cancela la anterior cuando cambian los parámetros", () => {
    const control = crearControl();

    const anterior = control.iniciarConsulta("pagina=1");
    const nueva = control.iniciarConsulta("pagina=2");

    assert.equal(anterior.controlador.signal.aborted, true);
    assert.equal(control.estaVigente(anterior), false);
    assert.equal(control.estaVigente(nueva), true);
});

test("una respuesta antigua no puede considerarse vigente", () => {
    const control = crearControl();

    const septiembre = control.iniciarConsulta("mes=septiembre");
    const octubre = control.iniciarConsulta("mes=octubre");

    const resultadosMostrados = [];

    if (control.estaVigente(septiembre)) {
        resultadosMostrados.push("septiembre");
    }

    if (control.estaVigente(octubre)) {
        resultadosMostrados.push("octubre");
    }

    assert.deepEqual(resultadosMostrados, ["octubre"]);
});

test("finalizar libera la consulta para una nueva solicitud", () => {
    const control = crearControl();

    const primera = control.iniciarConsulta("pagina=1");

    assert.equal(control.finalizarConsulta(primera), true);
    assert.equal(control.estaVigente(primera), false);

    const segunda = control.iniciarConsulta("pagina=1");

    assert.notEqual(primera, segunda);
    assert.equal(control.estaVigente(segunda), true);
});

test("una consulta antigua no puede finalizar la nueva", () => {
    const control = crearControl();

    const anterior = control.iniciarConsulta("pagina=1");
    const nueva = control.iniciarConsulta("pagina=2");

    assert.equal(control.finalizarConsulta(anterior), false);
    assert.equal(control.estaVigente(nueva), true);
});

test("permite cancelar manualmente la consulta actual", () => {
    const control = crearControl();

    const consulta = control.iniciarConsulta("pagina=1");

    assert.equal(control.cancelarConsultaActual(), true);
    assert.equal(consulta.controlador.signal.aborted, true);
    assert.equal(control.estaVigente(consulta), false);
    assert.equal(control.cancelarConsultaActual(), false);
});

test("rechaza claves vacías", () => {
    const control = crearControl();

    assert.throws(
        () => control.iniciarConsulta(""),
        /clave válida/
    );
});
