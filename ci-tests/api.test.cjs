'use strict';
// Ejecuta el server.js real con Express y JWT reales. Solo Supabase y dotenv
// se sustituyen para no leer .env ni acceder a bases de datos externas.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const serverPath = path.resolve(__dirname, '../api_/server.js');
const apiRequire = createRequire(serverPath);
const express = apiRequire('express');
const jwt = apiRequire('jsonwebtoken');
const SECRET = 'secreto-ficticio-solo-para-pruebas-ci';
const EMPLEADO = {
  id: '11111111-1111-4111-8111-111111111111', codigo: 'EMP-001',
  nombre_completo: 'Empleado de prueba CI', dui: '00000001-1', cargo: 'Analista'
};
const PLANTILLA = {
  id: '22222222-2222-4222-8222-222222222222', nombre: 'Planilla básica mensual'
};
const DATOS = {
  empleado_id: EMPLEADO.id, plantilla_id: PLANTILLA.id, mes: 10, anio: 2026,
  salario_base: '500.00', ingresos_adicionales: '50.00', descuentos_totales: '25.00'
};
const TOKEN = jwt.sign({ id: EMPLEADO.id, correo: 'demo@planillas.com' }, SECRET, { expiresIn: '1h' });

function prepararAPI(opciones = {}) {
  const registros = [];
  const supabase = {
    async rpc(nombre, datos) {
      assert.equal(nombre, 'verificar_login');
      const valido = datos.p_correo === 'demo@planillas.com' && datos.p_contrasena === 'Planilla123!';
      return { data: valido ? [{ id: EMPLEADO.id, correo: datos.p_correo }] : [], error: null };
    },
    from(tabla) {
      let filtro, registro;
      const consulta = {
        select() { return consulta; },
        eq(campo, valor) { filtro = { campo, valor }; return consulta; },
        insert(datos) { registro = datos; return consulta; },
        async maybeSingle() { return resolver(); },
        async single() { return resolver(); }
      };
      function resolver() {
        if (tabla === 'empleados') {
          return { data: !opciones.sinEmpleado && filtro?.valor === EMPLEADO.id ? { ...EMPLEADO } : null, error: null };
        }
        if (tabla === 'plantillas') {
          return { data: !opciones.sinPlantilla && filtro?.valor === PLANTILLA.id ? { ...PLANTILLA } : null, error: null };
        }
        if (tabla === 'planillas' && registro) {
          if (opciones.falloGuardado) return { data: null, error: { message: 'Fallo simulado de inserción' } };
          if (opciones.sinId) return { data: null, error: null };
          const guardado = { ...registro, id: '33333333-3333-4333-8333-333333333333', fecha_guardado: '2026-10-12T12:00:00Z' };
          registros.push(guardado);
          return { data: guardado, error: null };
        }
        throw new Error(`Consulta no contemplada por las pruebas: ${tabla}`);
      }
      return consulta;
    }
  };
  let app;
  function expressPruebas() {
    app = express();
    // server.js registra sus rutas; el puerto se abre después en el test.
    app.listen = () => undefined;
    return app;
  }
  Object.assign(expressPruebas, express);
  const modulo = { exports: {} };
  const contexto = {
    require(nombre) {
      if (nombre === 'express') return expressPruebas;
      if (nombre === 'dotenv') return { config() {} };
      if (nombre === '@supabase/supabase-js') return { createClient: () => supabase };
      return apiRequire(nombre);
    },
    process: { env: { JWT_SECRET: SECRET, PORT: '3000', SUPABASE_URL: 'https://ci.example.invalid', SUPABASE_SECRET_KEY: 'ficticia' } },
    console: { log() {}, error() {}, warn() {} },
    module: modulo, exports: modulo.exports,
    __dirname: path.dirname(serverPath), __filename: serverPath,
    Buffer, setTimeout, clearTimeout, setInterval, clearInterval
  };
  const cargar = vm.compileFunction(fs.readFileSync(serverPath, 'utf8'), Object.keys(contexto), { filename: serverPath });
  cargar(...Object.values(contexto));
  assert.ok(app, 'server.js debe crear la aplicación Express');
  return { app, registros };
}

async function conAPI(t, opciones = {}) {
  const estado = prepararAPI(opciones);
  // Evita usar el app.listen sustituido y abre un puerto local libre.
  const servidor = require('node:http').createServer(estado.app);
  await new Promise(resolve => servidor.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve, reject) => {
    servidor.close(error => error ? reject(error) : resolve());
    servidor.closeAllConnections();
  }));
  async function pedir(ruta, body, token = TOKEN) {
    const headers = {};
    if (token !== null) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const respuesta = await fetch(`http://127.0.0.1:${servidor.address().port}${ruta}`, {
      method: body === undefined ? 'GET' : 'POST', headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: respuesta.status, body: await respuesta.json() };
  }
  return { ...estado, pedir };
}

test('La API responde en /health', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/health', undefined, null);
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  assert.equal(r.body.mensaje, 'API funcionando');
});

test('El login válido genera un token verificable', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/api/auth/login', { correo: 'demo@planillas.com', contrasena: 'Planilla123!' }, null);
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  assert.equal(jwt.verify(r.body.token, SECRET).correo, 'demo@planillas.com');
});

test('El login incorrecto devuelve 401 y no genera token', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/api/auth/login', { correo: 'demo@planillas.com', contrasena: 'incorrecta' }, null);
  assert.equal(r.status, 401); assert.equal(r.body.ok, false); assert.equal(r.body.token, undefined);
});

for (const [nombre, token] of [
  ['sin sesión', null], ['token inválido', 'invalido'],
  ['token expirado', jwt.sign({ id: EMPLEADO.id }, SECRET, { expiresIn: -1 })]
]) {
  test(`Guardar rechaza ${nombre}`, async t => {
    const api = await conAPI(t);
    const r = await api.pedir('/api/planillas', DATOS, token);
    assert.equal(r.status, 401); assert.equal(r.body.ok, false); assert.equal(api.registros.length, 0);
  });
}

for (const [nombre, campo, valor] of [
  ['salario negativo', 'salario_base', '-1.00'],
  ['tres decimales', 'salario_base', '500.001'],
  ['letras en monto', 'ingresos_adicionales', 'abc'],
  ['monto vacío', 'descuentos_totales', ''],
  ['descuentos excesivos', 'descuentos_totales', '600.00'],
  ['mes cero', 'mes', 0], ['mes trece', 'mes', 13],
  ['año vacío', 'anio', ''], ['empleado vacío', 'empleado_id', ''],
  ['plantilla vacía', 'plantilla_id', ''],
  ['monto fuera de numeric 12 2', 'salario_base', '10000000000.00']
]) {
  test(`Validación rechaza ${nombre} sin insertar`, async t => {
    const api = await conAPI(t);
    const r = await api.pedir('/api/planillas', { ...DATOS, [campo]: valor });
    assert.equal(r.status, 400); assert.equal(r.body.ok, false);
    assert.ok(r.body.errores?.[campo], `Debe identificar ${campo}`);
    assert.equal(api.registros.length, 0); assert.equal(r.body.id, undefined);
  });
}

test('Guardar calcula 525.00 y conserva datos del empleado y plantilla', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/api/planillas', { ...DATOS, total_pagar: '1.00', empleado_nombre: 'Dato alterado' });
  assert.equal(r.status, 201); assert.equal(r.body.ok, true);
  assert.equal(r.body.mensaje, 'Planilla guardada'); assert.ok(r.body.id);
  assert.equal(Number(r.body.total_pagar), 525);
  assert.equal(api.registros.length, 1);
  const p = api.registros[0];
  assert.equal(p.total_pagar, '525.00'); assert.equal(p.salario_base, '500.00');
  assert.equal(p.ingresos_adicionales, '50.00'); assert.equal(p.descuentos_totales, '25.00');
  assert.equal(p.empleado_codigo, EMPLEADO.codigo); assert.equal(p.empleado_nombre, EMPLEADO.nombre_completo);
  assert.equal(p.empleado_dui, EMPLEADO.dui); assert.equal(p.empleado_cargo, EMPLEADO.cargo);
  assert.equal(p.plantilla_nombre, PLANTILLA.nombre); assert.equal(p.mes, 10); assert.equal(p.anio, 2026);
  assert.equal(r.body.id, p.id); assert.equal(r.body.fecha_guardado, p.fecha_guardado);
});

test('Montos cero y mes doce son válidos', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/api/planillas', { ...DATOS, mes: 12, salario_base: '0.00', ingresos_adicionales: '0.00', descuentos_totales: '0.00' });
  assert.equal(r.status, 201); assert.equal(Number(r.body.total_pagar), 0);
});

for (const [nombre, opcion] of [['empleado inexistente', 'sinEmpleado'], ['plantilla inexistente', 'sinPlantilla']]) {
  test(`Guardar rechaza ${nombre}`, async t => {
    const api = await conAPI(t, { [opcion]: true });
    const r = await api.pedir('/api/planillas', DATOS);
    assert.equal(r.status, 404); assert.equal(r.body.ok, false); assert.equal(api.registros.length, 0);
  });
}

for (const [nombre, opcion] of [['fallo en Supabase', 'falloGuardado'], ['respuesta sin identificador', 'sinId']]) {
  test(`Guardar no confirma éxito ante ${nombre}`, async t => {
    const api = await conAPI(t, { [opcion]: true });
    const r = await api.pedir('/api/planillas', DATOS);
    assert.equal(r.status, 500); assert.equal(r.body.ok, false);
    assert.equal(r.body.mensaje, 'No se pudo guardar la planilla. Intente nuevamente');
    assert.equal(r.body.id, undefined); assert.equal(api.registros.length, 0);
  });
}
