
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const crearServicioEmpleados = require('../api_/services/empleados');

const EMPLEADOS = [
    {
        id: '11111111-1111-4111-8111-111111111111',
        codigo: 'EMP001',
        nombre_completo: 'Ana Martínez',
        dui: '01234567-8',
        cargo: 'Analista',
        salario_base_mensual: 500,
        departamento_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        sucursal_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        departamentos: { nombre: 'Administración' },
        sucursales: { nombre: 'Sucursal Centro' }
    },
    {
        id: '22222222-2222-4222-8222-222222222222',
        codigo: 'EMP002',
        nombre_completo: 'Carlos Hernández',
        dui: '02345678-9',
        cargo: 'Auxiliar contable',
        salario_base_mensual: 700,
        departamento_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        sucursal_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        departamentos: { nombre: 'Contabilidad' },
        sucursales: { nombre: 'Sucursal Norte' }
    }
];

const DEPARTAMENTOS = [
    { id: EMPLEADOS[0].departamento_id, nombre: 'Administración' },
    { id: EMPLEADOS[1].departamento_id, nombre: 'Contabilidad' }
];

const SUCURSALES = [
    { id: EMPLEADOS[0].sucursal_id, nombre: 'Sucursal Centro' },
    { id: EMPLEADOS[1].sucursal_id, nombre: 'Sucursal Norte' }
];

function crearSupabaseFalso(datos = EMPLEADOS) {
    return {
        from(tabla) {
            let resultados = tabla === 'empleados'
                ? [...datos]
                : tabla === 'departamentos'
                    ? [...DEPARTAMENTOS]
                    : tabla === 'sucursales'
                        ? [...SUCURSALES]
                        : [];

            const consulta = {
                select() {
                    return consulta;
                },

                eq(campo, valor) {
                    resultados = resultados.filter(
                        registro => registro[campo] === valor
                    );
                    return consulta;
                },

                ilike(campo, patron) {
                    const texto = patron
                        .slice(1, -1)
                        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    const expresion = new RegExp(texto, 'i');

                    resultados = resultados.filter(
                        registro => expresion.test(registro[campo] || '')
                    );

                    return consulta;
                },

                order(campo, opciones = {}) {
                    const ascendente = opciones.ascending !== false;

                    resultados.sort((a, b) => {
                        const comparacion = String(a[campo] ?? '')
                            .localeCompare(String(b[campo] ?? ''));

                        return ascendente ? comparacion : -comparacion;
                    });

                    return consulta;
                },

                limit(cantidad) {
                    resultados = resultados.slice(0, cantidad);
                    return consulta;
                },

                then(resolve, reject) {
                    return Promise.resolve({
                        data: resultados,
                        error: null
                    }).then(resolve, reject);
                }
            };

            return consulta;
        }
    };
}

function crearServicio(datos = EMPLEADOS) {
    return crearServicioEmpleados(crearSupabaseFalso(datos));
}

test('HU-24: busca empleados por código exacto', async () => {
    const servicio = crearServicio();

    const resultado = await servicio.buscar({ termino: 'EMP001' });

    assert.equal(resultado.length, 1);
    assert.equal(resultado[0].nombre_completo, 'Ana Martínez');
});

test('HU-24: busca empleados por DUI exacto', async () => {
    const servicio = crearServicio();

    const resultado = await servicio.buscar({ termino: '02345678-9' });

    assert.equal(resultado.length, 1);
    assert.equal(resultado[0].codigo, 'EMP002');
});

test('HU-24: busca nombres parcialmente sin distinguir mayúsculas', async () => {
    const servicio = crearServicio();

    const resultado = await servicio.buscar({ termino: 'CAR' });

    assert.equal(resultado.length, 1);
    assert.equal(resultado[0].nombre_completo, 'Carlos Hernández');
});

test('HU-24: devuelve resultados vacíos con menos de dos caracteres', async () => {
    const servicio = crearServicio();

    const resultado = await servicio.buscar({ termino: 'C' });

    assert.deepEqual(resultado, []);
});

test('HU-24: combina los filtros de departamento y sucursal', async () => {
    const servicio = crearServicio();

    const resultado = await servicio.buscar({
        termino: 'a',
        departamentoId: EMPLEADOS[1].departamento_id,
        sucursalId: EMPLEADOS[1].sucursal_id
    });

    assert.deepEqual(resultado, []);
});

test('HU-24: conserva departamento y sucursal en los resultados', async () => {
    const servicio = crearServicio();

    const resultado = await servicio.buscar({ termino: 'Carlos' });

    assert.equal(resultado[0].departamentos.nombre, 'Contabilidad');
    assert.equal(resultado[0].sucursales.nombre, 'Sucursal Norte');
    assert.equal(resultado[0].salario_base_mensual, 700);
});

test('HU-24: no devuelve más de diez coincidencias', async () => {
    const empleados = Array.from({ length: 15 }, (_, indice) => ({
        ...EMPLEADOS[0],
        id: `11111111-1111-4111-8111-${String(indice + 1).padStart(12, '0')}`,
        codigo: `EMP${String(indice + 1).padStart(3, '0')}`,
        nombre_completo: `Empleado ${String(indice + 1).padStart(2, '0')}`
    }));

    const servicio = crearServicio(empleados);

    const resultado = await servicio.buscar({ termino: 'Empleado' });

    assert.equal(resultado.length, 10);
    assert.deepEqual(
        resultado.map(empleado => empleado.nombre_completo),
        [...resultado.map(empleado => empleado.nombre_completo)].sort()
    );
});

test('HU-24: consulta los catálogos de departamentos y sucursales', async () => {
    const servicio = crearServicio();

    const departamentos = await servicio.listarDepartamentos();
    const sucursales = await servicio.listarSucursales();

    assert.equal(departamentos.length, 2);
    assert.equal(sucursales.length, 2);
    assert.ok(departamentos.some(item => item.nombre === 'Contabilidad'));
    assert.ok(sucursales.some(item => item.nombre === 'Sucursal Norte'));
});
