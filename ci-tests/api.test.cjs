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
  id: '11111111-1111-4111-8111-111111111111',
  codigo: 'EMP-001',
  nombre_completo: 'Empleado de prueba CI',
  dui: '00000001-1',
  cargo: 'Analista',
  salario_base_mensual: '500.00',
  tipo_contrato: 'Indefinido'
};
const PLANTILLA = {
  id: '22222222-2222-4222-8222-222222222222', nombre: 'Planilla básica mensual'
};
const DATOS = {

  operacion_id: '44444444-4444-4444-8444-444444444444', // HU-17: identificador de la operación de guardado.
  novedades: [],
  periodo_pago: 'mensual',
  version_regla: require('../api_/utils/reglas-nomina.js').VERSION,
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
  id: '33333333-3333-4333-8333-333333333333',
  empleado_id: EMPLEADO.id,
  mes: 10,
  anio: 2026,
  periodo_pago: 'Mensual',
  plantilla_nombre: PLANTILLA.nombre,
  empleado_codigo: EMPLEADO.codigo,
  empleado_nombre: EMPLEADO.nombre_completo,
  empleado_dui: EMPLEADO.dui,
  empleado_cargo: EMPLEADO.cargo,
  tipo_contrato: 'Plazo fijo',
  salario_base: 500,
  salario_original: 450,
  motivo_ajuste: 'Aumento salarial autorizado',
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
  const borradores = [];
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

        // HU-17: simular el control de operaciones repetidas de Supabase.
        const operacionExistente = registros.find(
          registro => registro.operacion_id === datos.p_operacion_id
        );

        if (operacionExistente) {
          return {
            data: [{
              id: operacionExistente.id,
              fecha_guardado: operacionExistente.fecha_guardado,
              total_pagar: operacionExistente.total_pagar,
              creada_nueva: false
            }],
            error: null
          };
        }

        const registro = datos.p_registro;
        const descuentos = datos.p_descuentos;
        const novedades = datos.p_novedades; // HU-18: novedades recibidas por la función de Supabase.
        const ingresosDetalle = datos.p_ingresos;
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
          operacion_id: datos.p_operacion_id,
          id: PLANILLA_GUARDADA.id,
          fecha_guardado: PLANILLA_GUARDADA.fecha_guardado,
          descuentos,
          novedades,
          ingresos_detalle: ingresosDetalle,
          descuentos_totales: (totalDescuentos / 100).toFixed(2),
          total_pagar: (totalPagar / 100).toFixed(2)
        };

        registros.push(guardado);

        return {
          data: [{
            id: guardado.id,
            fecha_guardado: guardado.fecha_guardado,
            total_pagar: guardado.total_pagar,
            creada_nueva: true
          }],
          error: null
        };
      }

      // HU-23: simular la finalización atómica de un borrador.
      if (nombre === 'finalizar_borrador_validado') {
        const borrador = borradores.find(
          item =>
            item.id === datos.p_borrador_id &&
            item.propietario_id === datos.p_propietario_id
        );

        if (!borrador) {
          return {
            data: null,
            error: { message: 'Borrador no encontrado' }
          };
        }

        // Una finalización repetida devuelve la planilla existente.
        if (borrador.estado === 'Finalizado') {
          const existente = registros.find(
            item => item.id === borrador.planilla_final_id
          );

          return {
            data: existente
              ? [{ ...existente, creada_nueva: false }]
              : null,
            error: existente
              ? null
              : { message: 'Planilla definitiva no encontrada' }
          };
        }

        if (borrador.estado !== 'Borrador') {
          return {
            data: null,
            error: { message: 'El borrador no se puede finalizar' }
          };
        }

        const registro = datos.p_registro;

        if (
          registro.plantilla_id !== borrador.plantilla_id ||
          registro.empleado_id !== borrador.empleado_id
        ) {
          return {
            data: null,
            error: { message: 'Los datos no corresponden al borrador' }
          };
        }

        const guardado = {
          ...registro,
          id: PLANILLA_GUARDADA.id,
          fecha_guardado: PLANILLA_GUARDADA.fecha_guardado,
          descuentos: datos.p_descuentos,
          novedades: datos.p_novedades,
          ingresos_detalle: datos.p_ingresos,
          borrador_origen_id: borrador.id
        };

        registros.push(guardado);

        borrador.estado = 'Finalizado';
        borrador.planilla_final_id = guardado.id;
        borrador.actualizado_en = new Date().toISOString();

        return {
          data: [{
            id: guardado.id,
            fecha_guardado: guardado.fecha_guardado,
            total_pagar: guardado.total_pagar,
            creada_nueva: true
          }],
          error: null
        };
      }
      throw new Error(`Función RPC no contemplada: ${nombre}`);
    },

    from(tabla) {
      let filtro, registro;
      const filtros = [];
      let actualizacion = null;
      let operacion = null;
      let rango = null;

      const consulta = {
        select() { return consulta; },
        eq(campo, valor) {
          filtro = { campo, valor };
          filtros.push({ campo, valor });
          return consulta;
        },
        order() { return consulta; },
        range(desde, hasta) {
          rango = { desde, hasta };
          return consulta;
        },
        insert(datos) {
          registro = datos;
          operacion = 'insert';
          return consulta;
        },
        update(datos) {
          actualizacion = datos;
          operacion = 'update';
          return consulta;
        },
        async maybeSingle() { return resolver(true); },
        async single() { return resolver(true); },
        then(ok, fallo) {
          return Promise.resolve()
            .then(() => resolver(false))
            .then(ok, fallo);
        }
      };

      function resolver(unico = false) {
        if (tabla === 'planilla_borradores') {
          const coincide = borrador =>
            filtros.every(({ campo, valor }) =>
              borrador[campo] === valor
            );

          if (operacion === 'insert') {
            const nuevo = {
              id: '55555555-5555-4555-8555-555555555555',
              estado: 'Borrador',
              creado_en: '2026-10-24T10:00:00Z',
              actualizado_en: '2026-10-24T10:00:00Z',
              planilla_final_id: null,
              ...registro
            };

            borradores.push(nuevo);

            return {
              data: unico ? { ...nuevo } : [{ ...nuevo }],
              error: null
            };
          }

          if (operacion === 'update') {
            const encontrado = borradores.find(coincide);

            if (!encontrado) {
              return { data: unico ? null : [], error: null };
            }

            Object.assign(encontrado, actualizacion);

            return {
              data: unico ? { ...encontrado } : [{ ...encontrado }],
              error: null
            };
          }

          const encontrados = borradores.filter(coincide);

          return {
            data: unico
              ? (encontrados[0] ? { ...encontrados[0] } : null)
              : encontrados.map(borrador => ({ ...borrador })),
            error: null
          };
        }

        if (tabla === 'cuentas') {
          return {
            data: filtro?.valor === EMPLEADO.id
              ? {
                rol: opciones.rolCuenta ?? 'Encargado de nómina'
              }
              : null,
            error: null
          };
        }

        if (tabla === 'empleados') {
          return {
            data: !opciones.sinEmpleado && filtro?.valor === EMPLEADO.id
              ? {
                ...EMPLEADO,
                salario_base_mensual: opciones.empleadoSinSalario
                  ? null
                  : EMPLEADO.salario_base_mensual
              }
              : null,
            error: null
          };
        }

        if (tabla === 'plantillas') {
          return {
            data: !opciones.sinPlantilla &&
              filtro?.valor === PLANTILLA.id
              ? { ...PLANTILLA }
              : null,
            error: null
          };
        }

        if (tabla === 'planilla_ingresos') {
          return { data: [], error: null };
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

        if (tabla === 'planilla_novedades') {
          return {
            data: [{
              tipo: 'Permiso',
              fecha_inicio: '2026-10-05',
              fecha_fin: '2026-10-06',
              condicion_pago: 'Sin goce'
            }],
            error: null
          };
        }

        if (tabla === 'planillas' && !registro) {
          if (opciones.falloConsulta) {
            return {
              data: null,
              error: { message: 'Fallo simulado de consulta' }
            };
          }

          const guardadas = opciones.planillas ?? [{ ...PLANILLA_GUARDADA }];

          const filtradas = guardadas.filter(planilla =>
            filtros.every(({ campo, valor }) => planilla[campo] === valor)
          );

          if (unico) {
            return {
              data: filtradas[0] ?? null,
              error: null
            };
          }

          const ordenadas = [...filtradas].sort((a, b) =>
            b.anio - a.anio ||
            b.mes - a.mes ||
            String(b.fecha_guardado).localeCompare(String(a.fecha_guardado)) ||
            String(b.id).localeCompare(String(a.id))
          );

          return {
            data: rango
              ? ordenadas.slice(rango.desde, rango.hasta + 1)
              : ordenadas,
            count: filtradas.length,
            error: null
          };
        }

        if (tabla === 'planillas' && registro) {
          if (opciones.falloGuardado) {
            return {
              data: null,
              error: { message: 'Fallo simulado de inserción' }
            };
          }

          if (opciones.sinId) {
            return { data: null, error: null };
          }

          const guardado = {
            ...registro,
            id: '33333333-3333-4333-8333-333333333333',
            fecha_guardado: '2026-10-12T12:00:00Z'
          };

          registros.push(guardado);

          return { data: guardado, error: null };
        }

        throw new Error(
          `Consulta no contemplada por las pruebas: ${tabla}`
        );
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
  return { app, registros, borradores };
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

  async function pedir(ruta, body, token = TOKEN, metodo) {
    const headers = {};

    if (token !== null) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const respuesta = await fetch(
      `http://127.0.0.1:${servidor.address().port}${ruta}`,
      {
        method: metodo ?? (body === undefined ? 'GET' : 'POST'),
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      }
    );

    return {
      status: respuesta.status,
      body: await respuesta.json()
    };
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

// HU-17: repetir una operación no debe duplicar la planilla.
test('HU-17 devuelve la misma planilla al repetir una operación', async t => {
  const api = await conAPI(t);

  const primera = await api.pedir('/api/planillas', DATOS);
  const segunda = await api.pedir('/api/planillas', DATOS);

  assert.equal(primera.status, 201);
  assert.equal(primera.body.ok, true);

  assert.equal(segunda.status, 200);
  assert.equal(segunda.body.ok, true);

  assert.equal(segunda.body.id, primera.body.id);
  assert.equal(api.registros.length, 1);
});

// HU-17: rechazar identificadores de operación inválidos.
test('HU-17 rechaza identificador de operación inválido', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    operacion_id: 'identificador-invalido'
  });

  assert.equal(r.status, 400);
  assert.equal(r.body.ok, false);
  assert.equal(
    r.body.errores?.operacion_id,
    'Debe proporcionar un UUID válido'
  );
  assert.equal(api.registros.length, 0);
});

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

// HU-14: impedir guardar cuando no existe una regla legal vigente.
test('HU-14 rechaza planilla sin regla legal y no la guarda', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    mes: 4,
    anio: 2025
  });

  assert.equal(r.status, 400);
  assert.equal(r.body.ok, false);

  assert.equal(
    r.body.errores?.deducciones_legales,
    'No se pueden calcular las deducciones legales: falta configurar una regla'
  );

  assert.equal(api.registros.length, 0);
  assert.equal(r.body.id, undefined);
});

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


test('HU-18: la API envía novedades y días remunerados a Supabase', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    novedades: [
      {
        tipo: 'Ausencia',
        condicion: 'Sin goce',
        fechaInicio: '2026-10-03',
        fechaFin: '2026-10-05'
      },
      {
        tipo: 'Permiso',
        condicion: 'Con goce',
        fechaInicio: '2026-10-10',
        fechaFin: '2026-10-10'
      }
    ],
    dias_remunerados: 30
  });

  assert.equal(r.status, 201);
  assert.equal(r.body.ok, true);
  assert.equal(api.registros.length, 1);

  const guardado = api.registros[0];

  // La API calcula los días, sin confiar en el valor enviado por el cliente.
  assert.equal(guardado.dias_remunerados, 27);

  // Supabase recibe las novedades con los nombres de campos acordados.
  assert.deepEqual(guardado.novedades, [
    {
      tipo: 'Ausencia',
      fecha_inicio: '2026-10-03',
      fecha_fin: '2026-10-05',
      condicion_pago: 'Sin goce'
    },
    {
      tipo: 'Permiso',
      fecha_inicio: '2026-10-10',
      fecha_fin: '2026-10-10',
      condicion_pago: 'Con goce'
    }
  ]);
});

test('Guardar calcula 468.62 y conserva datos del empleado y plantilla', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/api/planillas', { ...DATOS, total_pagar: '1.00', empleado_nombre: 'Dato alterado' });
  assert.equal(r.status, 201); assert.equal(r.body.ok, true);
  assert.equal(r.body.mensaje, 'Planilla guardada'); assert.ok(r.body.id);
  // HU-16: comprobar los cinco componentes monetarios de la respuesta.
  assert.equal(r.body.salario_base, '500.00');
  assert.equal(r.body.ingresos_adicionales, '50.00');
  assert.equal(r.body.total_ingresos, '550.00');
  assert.equal(r.body.descuentos_totales, '81.38');
  assert.equal(Number(r.body.total_pagar), 468.62);
  assert.equal(api.registros.length, 1);
  const p = api.registros[0];
  // HU-26: conservar el contrato obtenido de la base de datos.
  assert.equal(p.tipo_contrato, 'Indefinido');
  assert.equal(p.total_pagar, '468.62'); assert.equal(p.salario_base, '500.00');
  assert.equal(p.ingresos_adicionales, '50.00'); assert.equal(p.descuentos_totales, '81.38');
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
    descuentos_totales: '0.00',
    motivo_ajuste: 'Ajuste salarial autorizado para esta planilla',
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

test('HU-25: El listado devuelve los datos de las planillas y la paginación', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/api/planillas');

  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);

  assert.deepEqual(r.body.planillas, [{
    id: PLANILLA_GUARDADA.id,
    empleado_id: PLANILLA_GUARDADA.empleado_id,
    periodo: 'Octubre 2026',
    nombre_completo: EMPLEADO.nombre_completo,
    frecuencia: PLANILLA_GUARDADA.periodo_pago,
    fecha_guardado: PLANILLA_GUARDADA.fecha_guardado,
    total_pagar: '525.00'
  }]);

  assert.equal(r.body.paginacion.pagina, 1);
  assert.equal(r.body.paginacion.tamanoPagina, 10);
});

test('HU-25: rechaza un identificador de empleado inválido', async t => {
  const api = await conAPI(t);
  const r = await api.pedir('/api/planillas?empleado_id=invalido');

  assert.equal(r.status, 400);
  assert.equal(r.body.ok, false);
  assert.equal(r.body.mensaje, 'Identificador de empleado inválido');
});

test('HU-25: rechaza números de página inválidos', async t => {
  const api = await conAPI(t);

  for (const pagina of ['0', '-1', 'abc', '1.5']) {
    const r = await api.pedir(`/api/planillas?pagina=${pagina}`);

    assert.equal(r.status, 400);
    assert.equal(r.body.ok, false);
    assert.equal(r.body.mensaje, 'Número de página inválido');
  }
});

test('HU-25: filtra las planillas por empleado', async t => {
  const empleadoOtro = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  const api = await conAPI(t, {
    planillas: [
      { ...PLANILLA_GUARDADA },
      {
        ...PLANILLA_GUARDADA,
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        empleado_id: empleadoOtro,
        empleado_nombre: 'Otro empleado'
      }
    ]
  });

  const r = await api.pedir(
    `/api/planillas?empleado_id=${EMPLEADO.id}`
  );

  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.planillas.length, 1);
  assert.equal(r.body.planillas[0].empleado_id, EMPLEADO.id);
  assert.equal(r.body.paginacion.totalRegistros, 1);
});

test('HU-25: muestra 10 planillas por página y ordena de más reciente a más antigua', async t => {
  const planillas = Array.from({ length: 15 }, (_, i) => ({
    ...PLANILLA_GUARDADA,
    id: `33333333-3333-4333-8333-${String(i + 1).padStart(12, '0')}`,
    mes: i + 1 <= 12 ? i + 1 : i - 11,
    anio: i + 1 <= 12 ? 2025 : 2026
  }));

  const api = await conAPI(t, { planillas });

  const primera = await api.pedir('/api/planillas?pagina=1');
  const segunda = await api.pedir('/api/planillas?pagina=2');

  assert.equal(primera.status, 200);
  assert.equal(segunda.status, 200);

  assert.equal(primera.body.planillas.length, 10);
  assert.equal(segunda.body.planillas.length, 5);

  assert.equal(primera.body.paginacion.totalRegistros, 15);
  assert.equal(primera.body.paginacion.totalPaginas, 2);
  assert.equal(primera.body.paginacion.tamanoPagina, 10);

  assert.equal(primera.body.planillas[0].id, planillas[14].id);
  assert.equal(segunda.body.planillas[4].id, planillas[0].id);
});

test('El detalle devuelve todos los datos guardados', async t => {
  const api = await conAPI(t);
  const r = await api.pedir(`/api/planillas/${PLANILLA_GUARDADA.id}`);
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  assert.deepEqual(r.body.planilla, {
    id: PLANILLA_GUARDADA.id, plantilla: PLANTILLA.nombre, periodo: 'Octubre 2026',
    fecha_guardado: PLANILLA_GUARDADA.fecha_guardado, codigo: EMPLEADO.codigo,
    nombre_completo: EMPLEADO.nombre_completo,
    dui: EMPLEADO.dui,
    cargo: EMPLEADO.cargo,
    tipo_contrato: 'Plazo fijo',
    salario_base: 500,
    // HU-21: verificar los datos del ajuste salarial.
    salario_original: 450,
    motivo_ajuste: 'Aumento salarial autorizado',
    ingresos_adicionales: 50,
    ingresos_detalle: [],
    detalle_ingresos_registrado: false,
    total_ingresos: "550.00",
    // HU-13: verificar que las horas se conservan al consultar.
    horas_ordinarias: 160,
    horas_extras: 8,
    periodo_pago: 'Mensual',
    descuentos_totales: 25,
    descuentos: [
      { concepto: 'Préstamo', importe: 10 },
      { concepto: 'Anticipo', importe: 15 }
    ],
    total_pagar: 525,
    // HU-18: novedades guardadas con los días calculados por la API.
    novedades: [
      { tipo: 'Permiso', fecha_inicio: '2026-10-05', fecha_fin: '2026-10-06', condicion_pago: 'Sin goce', dias: 2 }
    ]
  });
});

test('HU-26: una planilla antigua sin contrato devuelve null', async t => {
  const planillaAntigua = {
    ...PLANILLA_GUARDADA,
    tipo_contrato: null
  };

  const api = await conAPI(t, {
    planillas: [planillaAntigua]
  });

  const r = await api.pedir(`/api/planillas/${planillaAntigua.id}`);

  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.planilla.tipo_contrato, null);
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

test('HU-19: calcula salario proporcional y lo envía a Supabase', async t => {
  const api = await conAPI(t);

  const datos = {
    ...DATOS,
    modo_calculo: 'dias',
    salario_base_mensual: '900.00',
    motivo_ajuste: 'Ajuste autorizado del salario mensual a 900 dólares',
    ingresos_adicionales: '50.00',
    novedades: [
      {
        tipo: 'Ausencia',
        fechaInicio: '2026-10-03',
        fechaFin: '2026-10-04',
        condicion: 'Sin goce'
      }
    ]
  };

  delete datos.salario_base;
  delete datos.horas_ordinarias;
  delete datos.horas_extras;

  const r = await api.pedir('/api/planillas', datos);

  assert.equal(r.status, 201, JSON.stringify(r.body, null, 2));
  assert.equal(api.registros.length, 1);

  const guardado = api.registros[0];

  assert.equal(guardado.salario_base_mensual, '900.00');
  assert.equal(guardado.dias_remunerados, 28);
  assert.equal(guardado.salario_proporcional, '840.00');
  assert.equal(guardado.total_ingresos, undefined); // No es un campo persistido actualmente.
  assert.equal(guardado.salario_base, '840.00');
  assert.equal(guardado.ingresos_adicionales, '50.00');
});

test('HU-20: suma bonos e incentivos y envía el detalle a Supabase', async t => {
  const api = await conAPI(t);

  const detalle = [
    {
      tipo: 'Bono',
      concepto: 'Productividad',
      importe: '25.00',
      origen: 'Manual'
    },
    {
      tipo: 'Incentivo',
      concepto: 'Cumplimiento de metas',
      importe: '40.00',
      origen: 'Manual'
    }
  ];

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    ingresos_adicionales: '0.00',
    ingresos_detalle: detalle
  });

  assert.equal(r.status, 201);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.ingresos_adicionales, '65.00');

  assert.equal(api.registros.length, 1);
  assert.equal(api.registros[0].ingresos_adicionales, '65.00');
  assert.deepEqual(api.registros[0].ingresos_detalle, detalle);
});

for (const [nombre, ingreso] of [
  ['tipo inválido', { tipo: 'Otro', concepto: 'Bono', importe: '25.00' }],
  ['concepto vacío', { tipo: 'Bono', concepto: '   ', importe: '25.00' }],
  ['concepto demasiado largo', { tipo: 'Bono', concepto: 'A'.repeat(101), importe: '25.00' }],
  ['importe cero', { tipo: 'Bono', concepto: 'Productividad', importe: '0.00' }],
  ['importe negativo', { tipo: 'Bono', concepto: 'Productividad', importe: '-5.00' }],
  ['tres decimales', { tipo: 'Bono', concepto: 'Productividad', importe: '25.123' }],
  ['importe fuera de rango', { tipo: 'Bono', concepto: 'Productividad', importe: '10000000000.00' }]
]) {
  test(`HU-20: rechaza ${nombre}`, async t => {
    const api = await conAPI(t);

    const r = await api.pedir('/api/planillas', {
      ...DATOS,
      ingresos_detalle: [ingreso]
    });

    assert.equal(r.status, 400);
    assert.equal(r.body.ok, false);
    assert.equal(api.registros.length, 0);
  });
}
test('HU-21: rechaza un ajuste salarial sin motivo', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    salario_base: '600.00',
    motivo_ajuste: ''
  });

  assert.equal(r.status, 400);
  assert.equal(r.body.ok, false);
  assert.equal(
    r.body.errores.motivo_ajuste,
    'El motivo del ajuste debe tener entre 1 y 200 caracteres'
  );

  // No debe guardar ninguna planilla si falta la justificación.
  assert.equal(api.registros.length, 0);
});

test('HU-21: guarda un ajuste salarial con motivo válido', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    salario_base: '600.00',
    motivo_ajuste: 'Aumento salarial autorizado'
  });

  assert.equal(r.status, 201, JSON.stringify(r.body, null, 2));
  assert.equal(api.registros.length, 1);

  const guardado = api.registros[0];

  assert.equal(guardado.salario_original, '500.00');
  assert.equal(guardado.salario_base, '600.00');
  assert.equal(
    guardado.motivo_ajuste,
    'Aumento salarial autorizado'
  );
});

test('HU-21: rechaza motivos de más de 200 caracteres', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    salario_base: '600.00',
    motivo_ajuste: 'A'.repeat(201)
  });

  assert.equal(r.status, 400);
  assert.equal(r.body.ok, false);
  assert.equal(
    r.body.errores.motivo_ajuste,
    'El motivo del ajuste debe tener entre 1 y 200 caracteres'
  );

  // No debe guardar la planilla con un motivo inválido.
  assert.equal(api.registros.length, 0);
});

test('HU-21: conserva salario original nulo cuando no está registrado', async t => {
  const api = await conAPI(t, { empleadoSinSalario: true });

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    salario_base: '600.00',
    motivo_ajuste: ''
  });

  assert.equal(r.status, 201, JSON.stringify(r.body, null, 2));
  assert.equal(api.registros.length, 1);

  const guardado = api.registros[0];

  assert.equal(guardado.salario_original, null);
  assert.equal(guardado.salario_base, '600.00');
  assert.equal(guardado.motivo_ajuste, null);
});
test('HU-21: no exige motivo cuando el salario no cambia', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/planillas', {
    ...DATOS,
    salario_base: '500.00',
    motivo_ajuste: ''
  });

  assert.equal(r.status, 201, JSON.stringify(r.body, null, 2));
  assert.equal(api.registros.length, 1);

  const guardado = api.registros[0];

  assert.equal(guardado.salario_original, '500.00');
  assert.equal(guardado.salario_base, '500.00');
  assert.equal(guardado.motivo_ajuste, null);
});

//
// HU-22: Validación de importaciones CSV
//

const RUTA_IMPORTACION = '/api/planillas/validar-importacion';

const IMPORTACION_VALIDA = {
  empleado_id: EMPLEADO.id,
  mes: 10,
  anio: 2026,
  filas: [
    {
      numeroFila: 2,
      codigo_empleado: 'EMP-001',
      mes: '10',
      anio: '2026',
      tipo: 'bono',
      concepto: 'Bono de productividad',
      importe: '50.00'
    },
    {
      numeroFila: 3,
      codigo_empleado: 'EMP-001',
      mes: '10',
      anio: '2026',
      tipo: 'incentivo',
      concepto: 'Cumplimiento de metas',
      importe: '25.50'
    },
    {
      numeroFila: 4,
      codigo_empleado: 'EMP-001',
      mes: '10',
      anio: '2026',
      tipo: 'descuento',
      concepto: 'Anticipo',
      importe: '10.00'
    }
  ]
};

test('HU-22: valida una importación correcta sin guardar', async t => {
  const api = await conAPI(t);

  const r = await api.pedir(RUTA_IMPORTACION, IMPORTACION_VALIDA);

  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.valido, true);
  assert.equal(r.body.filas.length, 3);
  assert.equal(r.body.total_ingresos, '75.50');
  assert.equal(r.body.total_descuentos, '10.00');
  assert.equal(api.registros.length, 0);
});

test('HU-22: rechaza un código de empleado diferente', async t => {
  const api = await conAPI(t);

  const r = await api.pedir(RUTA_IMPORTACION, {
    ...IMPORTACION_VALIDA,
    filas: [{
      ...IMPORTACION_VALIDA.filas[0],
      codigo_empleado: 'EMP-999'
    }]
  });

  assert.equal(r.body.valido, false);
  assert.ok(
    r.body.errores.some(e => e.campo === 'codigo_empleado')
  );
  assert.equal(api.registros.length, 0);
});

test('HU-22: rechaza un período diferente', async t => {
  const api = await conAPI(t);

  const r = await api.pedir(RUTA_IMPORTACION, {
    ...IMPORTACION_VALIDA,
    filas: [{
      ...IMPORTACION_VALIDA.filas[0],
      mes: '11',
      anio: '2025'
    }]
  });

  assert.equal(r.body.valido, false);
  assert.ok(r.body.errores.some(e => e.campo === 'mes'));
  assert.ok(r.body.errores.some(e => e.campo === 'anio'));
});

test('HU-22: rechaza descuentos reservados', async t => {
  const api = await conAPI(t);

  const r = await api.pedir(RUTA_IMPORTACION, {
    ...IMPORTACION_VALIDA,
    filas: [{
      ...IMPORTACION_VALIDA.filas[0],
      tipo: 'descuento',
      concepto: 'ISSS'
    }]
  });

  assert.equal(r.body.valido, false);
  assert.ok(r.body.errores.some(e => e.campo === 'concepto'));
});

test('HU-22: rechaza importes inválidos', async t => {
  const api = await conAPI(t);

  const r = await api.pedir(RUTA_IMPORTACION, {
    ...IMPORTACION_VALIDA,
    filas: [
      { ...IMPORTACION_VALIDA.filas[0], importe: '-5.00' },
      { ...IMPORTACION_VALIDA.filas[1], importe: '0' },
      { ...IMPORTACION_VALIDA.filas[2], importe: '12.345' }
    ]
  });

  assert.equal(r.body.valido, false);
  assert.equal(
    r.body.errores.filter(e => e.campo === 'importe').length,
    3
  );
  assert.equal(api.registros.length, 0);
});

test('HU-22: rechaza más de 100 registros', async t => {
  const api = await conAPI(t);

  const r = await api.pedir(RUTA_IMPORTACION, {
    ...IMPORTACION_VALIDA,
    filas: Array.from(
      { length: 101 },
      (_, i) => ({
        ...IMPORTACION_VALIDA.filas[0],
        numeroFila: i + 2
      })
    )
  });

  assert.equal(r.status, 400);
  assert.equal(r.body.valido, false);
});

test('HU-22: exige autenticación', async t => {
  const api = await conAPI(t);

  const r = await api.pedir(
    RUTA_IMPORTACION,
    IMPORTACION_VALIDA,
    null
  );

  assert.equal(r.status, 401);
  assert.equal(api.registros.length, 0);
});

//
// HU-23: PRUEBAS DE BORRADORES
//

const CONTENIDO_BORRADOR = {
  version_formato: 1,
  plantilla: { id: PLANTILLA.id },
  empleado: null,
  mes: '',
  anio: '',
  periodo_pago: '',
  salario_base: '',
  ingresos_adicionales: '',
  horas_ordinarias: '',
  horas_extras: '',
  ingresos: [],
  descuentos: [],
  novedades: []
};

const CONTENIDO_BORRADOR_COMPLETO = {
  ...CONTENIDO_BORRADOR,
  plantilla: { id: PLANTILLA.id },
  empleado: { id: EMPLEADO.id },
  mes: DATOS.mes,
  anio: DATOS.anio,
  periodo_pago: DATOS.periodo_pago,
  salario_base: DATOS.salario_base,
  ingresos_adicionales: DATOS.ingresos_adicionales,
  horas_ordinarias: DATOS.horas_ordinarias,
  horas_extras: DATOS.horas_extras,
  ingresos: [],
  descuentos: DATOS.descuentos,
  novedades: DATOS.novedades
};

test('HU-23: permite crear un borrador incompleto', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  assert.equal(r.status, 201);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.borrador.estado, 'Borrador');
  assert.equal(r.body.borrador.propietario_id, EMPLEADO.id);
  assert.equal(r.body.borrador.empleado_id, null);
  assert.equal(api.borradores.length, 1);
});

test('HU-23: lista los borradores del usuario', async t => {
  const api = await conAPI(t);

  await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  const r = await api.pedir('/api/borradores');

  assert.equal(r.status, 200);
  assert.equal(r.body.ok, true);
  assert.equal(r.body.borradores.length, 1);
});

test('HU-23: recupera un borrador existente', async t => {
  const api = await conAPI(t);

  const creado = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  const id = creado.body.borrador.id;
  const r = await api.pedir(`/api/borradores/${id}`);

  assert.equal(r.status, 200);
  assert.equal(r.body.borrador.id, id);
  assert.deepEqual(
    r.body.borrador.contenido,
    CONTENIDO_BORRADOR
  );
});

test('HU-23: actualiza el borrador sin cambiar su ID', async t => {
  const api = await conAPI(t);

  const creado = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  const id = creado.body.borrador.id;

  const contenidoActualizado = {
    ...CONTENIDO_BORRADOR,
    mes: '10',
    anio: '2026'
  };

  const r = await api.pedir(
    `/api/borradores/${id}`,
    { contenido: contenidoActualizado },
    TOKEN,
    'PUT'
  );

  assert.equal(r.status, 200);
  assert.equal(r.body.borrador.id, id);
  assert.equal(r.body.borrador.contenido.mes, '10');
  assert.equal(api.borradores.length, 1);
});

test('HU-23: rechaza crear borradores sin plantilla', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/borradores', {
    contenido: {
      ...CONTENIDO_BORRADOR,
      plantilla: null
    }
  });

  assert.equal(r.status, 400);
  assert.equal(r.body.ok, false);
  assert.equal(api.borradores.length, 0);
});

test('HU-23: rechaza solicitudes sin autenticación', async t => {
  const api = await conAPI(t);

  const r = await api.pedir(
    '/api/borradores',
    { contenido: CONTENIDO_BORRADOR },
    null
  );

  assert.equal(r.status, 401);
  assert.equal(api.borradores.length, 0);
});

test('HU-23: impide modificar un borrador finalizado', async t => {
  const api = await conAPI(t);

  const creado = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  const id = creado.body.borrador.id;
  api.borradores[0].estado = 'Finalizado';

  const r = await api.pedir(
    `/api/borradores/${id}`,
    { contenido: CONTENIDO_BORRADOR },
    TOKEN,
    'PUT'
  );

  assert.equal(r.status, 404);
  assert.equal(api.borradores[0].estado, 'Finalizado');
});
//
// HU-23: PRUEBAS DE SEGURIDAD
//

test('HU-23: no permite recuperar borradores de otra cuenta', async t => {
  const api = await conAPI(t);

  const creado = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  const id = creado.body.borrador.id;

  // Simulamos que el borrador pertenece a otra cuenta.
  api.borradores[0].propietario_id =
    '99999999-9999-4999-8999-999999999999';

  const r = await api.pedir(`/api/borradores/${id}`);

  assert.equal(r.status, 404);
  assert.equal(r.body.ok, false);
});

test('HU-23: no permite actualizar borradores de otra cuenta', async t => {
  const api = await conAPI(t);

  const creado = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  const id = creado.body.borrador.id;

  api.borradores[0].propietario_id =
    '99999999-9999-4999-8999-999999999999';

  const r = await api.pedir(
    `/api/borradores/${id}`,
    {
      contenido: {
        ...CONTENIDO_BORRADOR,
        mes: '10'
      }
    },
    TOKEN,
    'PUT'
  );

  assert.equal(r.status, 404);
  assert.equal(api.borradores[0].contenido.mes, '');
});

test('HU-23: no muestra borradores de otras cuentas en el listado', async t => {
  const api = await conAPI(t);

  await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  api.borradores[0].propietario_id =
    '99999999-9999-4999-8999-999999999999';

  const r = await api.pedir('/api/borradores');

  assert.equal(r.status, 200);
  assert.equal(r.body.borradores.length, 0);
});

test('HU-23: rechaza identificadores de borrador inválidos', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/borradores/123');

  assert.equal(r.status, 400);
  assert.equal(r.body.ok, false);
});

test('HU-23: rechaza valores salariales inválidos', async t => {
  const api = await conAPI(t);

  const r = await api.pedir('/api/borradores', {
    contenido: {
      ...CONTENIDO_BORRADOR,
      salario_base: '-100'
    }
  });

  assert.equal(r.status, 400);
  assert.equal(api.borradores.length, 0);
});
test('HU-23: rechaza cuentas sin el rol autorizado', async t => {
  const api = await conAPI(t, {
    rolCuenta: 'Empleado'
  });

  const r = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  assert.equal(r.status, 403);
  assert.equal(r.body.ok, false);
  assert.equal(api.borradores.length, 0);
});
test('HU-23: exige confirmar la revisión antes de finalizar', async t => {
  const api = await conAPI(t);

  const respuesta = await api.pedir(
    '/api/borradores/55555555-5555-4555-8555-555555555555/finalizar',
    { confirmar_revision: false }
  );

  assert.equal(respuesta.status, 400);
  assert.equal(respuesta.body.ok, false);
});

test('HU-23: impide finalizar un borrador de otra cuenta', async t => {
  const api = await conAPI(t);

  const creado = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  assert.equal(creado.status, 201);

  api.borradores[0].propietario_id =
    '99999999-9999-4999-8999-999999999999';

  const respuesta = await api.pedir(
    `/api/borradores/${api.borradores[0].id}/finalizar`,
    { confirmar_revision: true }
  );

  assert.equal(respuesta.status, 404);
  assert.equal(respuesta.body.ok, false);
});

test('HU-23: rechaza finalizar un borrador incompleto', async t => {
  const api = await conAPI(t);

  const creado = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR
  });

  assert.equal(creado.status, 201);

  const respuesta = await api.pedir(
    `/api/borradores/${creado.body.borrador.id}/finalizar`,
    { confirmar_revision: true }
  );

  assert.equal(respuesta.status, 400);
  assert.equal(respuesta.body.ok, false);
});

test('HU-23: finaliza un borrador y crea una planilla definitiva', async t => {
  const api = await conAPI(t);

  const creado = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR_COMPLETO
  });

  assert.equal(creado.status, 201);

  const idBorrador = creado.body.borrador.id;

  const respuesta = await api.pedir(
    `/api/borradores/${idBorrador}/finalizar`,
    { confirmar_revision: true }
  );

  assert.equal(
    respuesta.status,
    201,
    `Respuesta inesperada: ${JSON.stringify(respuesta.body)}`
  );

  assert.equal(respuesta.body.ok, true);
  assert.equal(respuesta.body.borrador_id, idBorrador);

  assert.equal(api.registros.length, 1);
  assert.equal(api.borradores.length, 1);

  const borrador = api.borradores[0];
  const planilla = api.registros[0];
  // HU-26: conservar el contrato al finalizar un borrador.
  assert.equal(planilla.tipo_contrato, 'Indefinido');

  assert.equal(borrador.estado, 'Finalizado');
  assert.equal(borrador.planilla_final_id, planilla.id);
  assert.equal(respuesta.body.id, planilla.id);
  assert.equal(planilla.borrador_origen_id, idBorrador);
});

test('HU-23: no duplica la planilla al finalizar dos veces', async t => {
  const api = await conAPI(t);

  const creado = await api.pedir('/api/borradores', {
    contenido: CONTENIDO_BORRADOR_COMPLETO
  });

  assert.equal(creado.status, 201);

  const idBorrador = creado.body.borrador.id;
  const ruta = `/api/borradores/${idBorrador}/finalizar`;

  const primera = await api.pedir(ruta, {
    confirmar_revision: true
  });

  assert.equal(primera.status, 201);
  assert.equal(api.registros.length, 1);

  const segunda = await api.pedir(ruta, {
    confirmar_revision: true
  });

  // La API debe impedir una segunda finalización.
  assert.equal(segunda.status, 409);
  assert.equal(segunda.body.ok, false);

  // La planilla definitiva original permanece intacta.
  assert.equal(api.registros.length, 1);
  assert.equal(api.borradores.length, 1);
  assert.equal(api.borradores[0].estado, 'Finalizado');
  assert.equal(
    api.borradores[0].planilla_final_id,
    primera.body.id
  );
});