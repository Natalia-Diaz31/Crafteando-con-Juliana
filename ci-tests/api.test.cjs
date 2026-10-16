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
  empleado_id: EMPLEADO.id,
  plantilla_id: PLANTILLA.id,
  mes: 10,
  anio: 2026,
  salario_base: '500.00',
  ingresos_adicionales: '50.00',
  // HU-13: cantidades de horas trabajadas.
  horas_ordinarias: '160.00',
  horas_extras: '8.00',

  // HU-12: el detalle es la fuente del total de descuentos.
  descuentos: [
    { concepto: 'Préstamo', importe: '10.00' },
    { concepto: 'Anticipo', importe: '15.00' }
  ],

  // Valor deliberadamente incorrecto para comprobar
  // que la API calcule el total por su cuenta.
  descuentos_totales: '999.00'
};

const PLANILLA_GUARDADA = {
  id: '33333333-3333-4333-8333-333333333333', mes: 10, anio: 2026,
  plantilla_nombre: PLANTILLA.nombre, empleado_codigo: EMPLEADO.codigo,
  empleado_nombre: EMPLEADO.nombre_completo, empleado_dui: EMPLEADO.dui, empleado_cargo: EMPLEADO.cargo,
  salario_base: 500,
  ingresos_adicionales: 50,

  // HU-13: horas conservadas en la planilla guardada.
  horas_ordinarias: 160,
  horas_extras: 8,

  descuentos_totales: 25,
  total_pagar: 525,
  fecha_guardado: '2026-10-12T12:00:00Z'
};
const TOKEN = jwt.sign({ id: EMPLEADO.id, correo: 'demo@planillas.com' }, SECRET, { expiresIn: '1h' });

function prepararAPI(opciones = {}) {
  const registros = [];
  const supabase = {
    async rpc(nombre, datos) {
      if (nombre === 'verificar_login') {
        const valido =
          datos.p_correo === 'demo@planillas.com' &&
          datos.p_contrasena === 'Planilla123!';

        return {
          data: valido
            ? [{ id: EMPLEADO.id, correo: datos.p_correo }]
            : [],
          error: null
        };
      }

      if (nombre === 'guardar_planilla_con_descuentos') {
        if (opciones.falloGuardado) {
          return {
            data: null,
            error: { message: 'Fallo simulado de guardado' }
          };
        }

        if (opciones.sinId) {
          return { data: [], error: null };
        }

        const registro = datos.p_registro;
        const descuentos = datos.p_descuentos;

        const totalDescuentos = descuentos.reduce(
          (suma, descuento) => suma + Math.round(Number(descuento.importe) * 100),
          0
        );

        const totalPagar =
          Math.round(Number(registro.salario_base) * 100) +
          Math.round(Number(registro.ingresos_adicionales) * 100) -
          totalDescuentos;

        const guardado = {
          ...registro,
          id: PLANILLA_GUARDADA.id,
          fecha_guardado: PLANILLA_GUARDADA.fecha_guardado,
          descuentos,
          descuentos_totales: (totalDescuentos / 100).toFixed(2),
          total_pagar: (totalPagar / 100).toFixed(2)
        };

        registros.push(guardado);

        return {
          data: [{
            id: guardado.id,
            fecha_guardado: guardado.fecha_guardado,
            total_pagar: guardado.total_pagar
          }],
          error: null
        };
      }

      throw new Error(`Función RPC no contemplada: ${nombre}`);
    },
    from(tabla) {
      let filtro, registro;
      const consulta = {
        select() { return consulta; },
        eq(campo, valor) { filtro = { campo, valor }; return consulta; },
        order() { return consulta; },
        insert(datos) { registro = datos; return consulta; },
        async maybeSingle() { return resolver(); },
        async single() { return resolver(); },
        // Los listados usan await directamente sobre la consulta.
        then(ok, fallo) { return Promise.resolve().then(resolver).then(ok, fallo); }
      };
      function resolver() {
        if (tabla === 'cuentas') {
          return {
            data: filtro?.valor === EMPLEADO.id
              ? { rol: 'Encargado de nómina' }
              : null,
            error: null
          };
        }
        if (tabla === 'empleados') {
          return { data: !opciones.sinEmpleado && filtro?.valor === EMPLEADO.id ? { ...EMPLEADO } : null, error: null };
        }
        if (tabla === 'plantillas') {
          return { data: !opciones.sinPlantilla && filtro?.valor === PLANTILLA.id ? { ...PLANTILLA } : null, error: null };
        }
        if (tabla === 'planilla_descuentos') {
          return {
            data: [
              { concepto: 'Préstamo', importe: 10 },
              { concepto: 'Anticipo', importe: 15 }
            ],
            error: null
          };
        }
        if (tabla === 'planillas' && !registro) {
          if (opciones.falloConsulta) return { data: null, error: { message: 'Fallo simulado de consulta' } };
          const guardadas = [{ ...PLANILLA_GUARDADA }];
          if (filtro) return { data: guardadas.find(p => p[filtro.campo] === filtro.valor) ?? null, error: null };
          return { data: guardadas, error: null };
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
      if (nombre === 'dotenv') return { config() { } };
      if (nombre === '@supabase/supabase-js') return { createClient: () => supabase };
      return apiRequire(nombre);
    },
    process: { env: { JWT_SECRET: SECRET, PORT: '3000', SUPABASE_URL: 'https://ci.example.invalid', SUPABASE_SECRET_KEY: 'ficticia' } },
    console: { log() { }, error() { }, warn() { } },
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
  ['monto vacío', 'descuentos', [{ concepto: 'Préstamo', importe: '' }]],
  ['descuentos excesivos', 'descuentos', [{ concepto: 'Préstamo', importe: '600.00' }]],
  ['mes cero', 'mes', 0], ['mes trece', 'mes', 13],
  ['año vacío', 'anio', ''], ['empleado vacío', 'empleado_id', ''],
  ['plantilla vacía', 'plantilla_id', ''],
  ['monto fuera de numeric 12 2', 'salario_base', '10000000000.00']
]) {
  test(`Validación rechaza ${nombre} sin insertar`, async t => {
    const api = await conAPI(t);
    const r = await api.pedir('/api/planillas', { ...DATOS, [campo]: valor });
    assert.equal(r.status, 400); assert.equal(r.body.ok, false);
    if (campo === 'descuentos') {
      assert.ok(
        r.body.errores?.['descuentos[0].importe'] ||
        r.body.errores?.descuentos_totales,
        'Debe identificar el error en los descuentos'
      );
    } else {
      assert.ok(r.body.errores?.[campo], `Debe identificar ${campo}`);
    }
    assert.equal(api.registros.length, 0); assert.equal(r.body.id, undefined);
  });
}

// HU-13: validar las horas ordinarias y extras.
for (const [campo, valor, descripcion] of [
  ['horas_ordinarias', '', 'horas ordinarias vacías'],
  ['horas_ordinarias', '-5', 'horas ordinarias negativas'],
  ['horas_ordinarias', 'abc', 'horas ordinarias con letras'],
  ['horas_ordinarias', '160.123', 'horas ordinarias con más de dos decimales'],
  ['horas_extras', '', 'horas extras vacías'],
  ['horas_extras', '-2', 'horas extras negativas'],
  ['horas_extras', 'abc', 'horas extras con letras'],
  ['horas_extras', '8.123', 'horas extras con más de dos decimales']
]) {
  test(`HU-13 rechaza ${descripcion}`, async t => {
    const api = await conAPI(t);

    const r = await api.pedir('/api/planillas', {
      ...DATOS,
      [campo]: valor
    });

    assert.equal(r.status, 400);
    assert.equal(r.body.ok, false);
    assert.ok(r.body.errores?.[campo]);
    assert.equal(api.registros.length, 0);
  });
}

test('HU-12 rechaza descuentos con concepto vacío', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    descuentos: [
      { concepto: '   ', importe: '10.00' }
    ]
  });

  assert.equal(r.status, 400);
  assert.equal(r.body.ok, false);
  assert.ok(r.body.errores?.['descuentos[0].concepto']);
  assert.equal(api.registros.length, 0);
});

test('HU-12 rechaza descuentos con más de dos decimales', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    descuentos: [
      { concepto: 'Préstamo', importe: '10.555' }
    ]
  });

  assert.equal(r.status, 400);
  assert.equal(r.body.ok, false);
  assert.ok(r.body.errores?.['descuentos[0].importe']);
  assert.equal(api.registros.length, 0);
});

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
  // HU-13: comprobar que se guardan ambas cantidades de horas.
  assert.equal(p.horas_ordinarias, '160.00');
  assert.equal(p.horas_extras, '8.00');
  assert.equal(p.empleado_codigo, EMPLEADO.codigo); assert.equal(p.empleado_nombre, EMPLEADO.nombre_completo);
  assert.equal(p.empleado_dui, EMPLEADO.dui); assert.equal(p.empleado_cargo, EMPLEADO.cargo);
  assert.equal(p.plantilla_nombre, PLANTILLA.nombre); assert.equal(p.mes, 10); assert.equal(p.anio, 2026);
  assert.equal(r.body.id, p.id); assert.equal(r.body.fecha_guardado, p.fecha_guardado);
});

test('Montos cero y mes doce son válidos', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    mes: 12,
    salario_base: '0.00',
    ingresos_adicionales: '0.00',
    descuentos: [],
    descuentos_totales: '0.00'
  });

  assert.equal(r.status, 201);
  assert.equal(Number(r.body.total_pagar), 0);
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

for (const ruta of ['/api/planillas', `/api/planillas/${PLANILLA_GUARDADA.id}`]) {
  test(`Consultar ${ruta} rechaza sin sesión`, async t => {
    const api = await conAPI(t);
    const r = await api.pedir(ruta, undefined, null);
    assert.equal(r.status, 401); assert.equal(r.body.ok, false);
  });
}

test('El listado devuelve identificador, período, nombre y total', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/api/planillas');
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  assert.deepEqual(r.body.planillas, [{
    id: PLANILLA_GUARDADA.id, periodo: 'Octubre 2026', nombre_completo: EMPLEADO.nombre_completo,
    total_pagar: 525, fecha_guardado: PLANILLA_GUARDADA.fecha_guardado
  }]);
});

test('El detalle devuelve todos los datos guardados', async t => {
  const api = await conAPI(t);
  const r = await api.pedir(`/api/planillas/${PLANILLA_GUARDADA.id}`);
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  assert.deepEqual(r.body.planilla, {
    id: PLANILLA_GUARDADA.id, plantilla: PLANTILLA.nombre, periodo: 'Octubre 2026',
    fecha_guardado: PLANILLA_GUARDADA.fecha_guardado, codigo: EMPLEADO.codigo,
    nombre_completo: EMPLEADO.nombre_completo, dui: EMPLEADO.dui, cargo: EMPLEADO.cargo,
    salario_base: 500,
    ingresos_adicionales: 50,
    // HU-13: verificar que las horas se conservan al consultar.
    horas_ordinarias: 160,
    horas_extras: 8,
    descuentos_totales: 25,
    descuentos: [
      { concepto: 'Préstamo', importe: 10 },
      { concepto: 'Anticipo', importe: 15 }
    ],
    total_pagar: 525
  });
});

test('El detalle rechaza un identificador inválido', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/api/planillas/123');
  assert.equal(r.status, 400); assert.equal(r.body.ok, false);
});

test('El detalle de una planilla inexistente devuelve 404', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/api/planillas/44444444-4444-4444-8444-444444444444');
  assert.equal(r.status, 404); assert.equal(r.body.mensaje, 'Planilla no encontrada');
});

test('La consulta no devuelve datos ante fallo en Supabase', async t => {
  const api = await conAPI(t, { falloConsulta: true });
  const r = await api.pedir('/api/planillas');
  assert.equal(r.status, 500); assert.equal(r.body.ok, false); assert.equal(r.body.planillas, undefined);
});
