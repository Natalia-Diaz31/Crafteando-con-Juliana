'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const motor = require('../api_/utils/reglas-nomina.js');
const datos = { salario_base: '500.00', ingresos_adicionales: '50.00', periodo_pago: 'mensual', mes: 10, anio: 2026 };
test('AFP e ISSS usan salario más adicionales; redondeo exacto de medio centavo', () => {
    const r = motor.calcular(datos);
    assert.equal(r.total_ingresos, '550.00');
    assert.deepEqual(r.detalle.map(d => d.importe), ['16.50','39.88','0.00']);
    assert.equal(r.base_renta, '493.62'); assert.equal(r.total, '56.38');
});
for (const [periodo, tope] of [['mensual','30.00'], ['quincenal','15.00'], ['semanal','7.50']]) {
    for (const salario of ['1000.00','5000.00']) {
        test(`Tope ISSS ${periodo}, salario ${salario}`, () => {
            const r = motor.calcular({ ...datos, salario_base: salario, ingresos_adicionales: '0.00', periodo_pago: periodo });
            assert.equal(r.detalle[0].importe, tope);
            assert.equal(r.detalle[1].importe, salario === '1000.00' ? '72.50' : '362.50');
        });
    }
}
const tablas = {
    mensual: [[0,'I',0],[55000,'I',0],[55001,'II',1767],[89524,'II',5219],[89525,'III',6000],[203810,'III',28857],[203811,'IV',28857]],
    quincenal: [[0,'I',0],[27500,'I',0],[27501,'II',883],[44762,'II',2609],[44763,'III',3000],[101905,'III',14429],[101906,'IV',14428]],
    semanal: [[0,'I',0],[13750,'I',0],[13751,'II',442],[22381,'II',1305],[22382,'III',1500],[50952,'III',7214],[50953,'IV',7214]]
};
for (const [periodo, casos] of Object.entries(tablas)) {
    for (const [base, tramo, esperado] of casos) {
        test(`Renta ${periodo}: base ${motor.decimal(base)}, tramo ${tramo}`, () => {
            const r = motor.calcularRenta(base, periodo);
            assert.equal(r.tramo, tramo); assert.equal(r.centavos, esperado);
        });
    }
}
test('Salario cero produce tres deducciones cero', () => {
    const r = motor.calcular({ ...datos, salario_base: '0.00', ingresos_adicionales: '0.00' });
    assert.equal(r.total, '0.00'); assert.equal(r.detalle.length, 3);
});
for (const monto of ['', '-1', '1.234', 'abc', '1e3', '10000000000.00']) {
    test(`Rechaza monto inválido ${JSON.stringify(monto)}`, () => assert.throws(() => motor.calcular({ ...datos, salario_base: monto })));
}
test('No hay regla para fechas anteriores a mayo 2025', () => assert.throws(() => motor.calcular({ ...datos, mes: 4, anio: 2025 }), /falta configurar una regla/));
test('No admite una frecuencia inexistente', () => assert.throws(() => motor.calcular({ ...datos, periodo_pago: 'diario' })));
test('Suma que supera el límite de almacenamiento se rechaza', () => assert.throws(() => motor.calcular({ ...datos, salario_base: '9999999999.99', ingresos_adicionales: '0.01' })));

test('Navegador y API usan exactamente las mismas reglas', () => {
 const fs = require('node:fs'); const path = require('node:path');
 assert.equal(fs.readFileSync(path.join(__dirname,'../js/reglas-nomina.js'),'utf8'), fs.readFileSync(path.join(__dirname,'../api_/utils/reglas-nomina.js'),'utf8'));
});
