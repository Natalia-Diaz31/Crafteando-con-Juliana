/* HU-14. Reglas del proyecto v1. Un mismo motor para navegador y API.
 * Importes en centavos. Porcentajes con BigInt y redondeo half-up por deducción.
 * Tablas: Decreto Ejecutivo 10 (2025), art. 1 a-c. Ver docs/HU14_IMPLEMENTACION.md.
 */
(function (root, factory) {
    const motor = factory();
    if (typeof module === 'object' && module.exports) module.exports = motor;
    else root.ReglasNomina = motor;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const VERSION = 'HU14-proyecto-2025-05-v1';
    const FUENTE = 'https://www.transparenciafiscal.gob.sv/downloads/pdf/700-DGII-DC-2025-01.pdf';
    const MAXIMO = 999999999999;
    const PERIODOS = {
        mensual: { nombre: 'Mensual', tope: 3000, limites: [55000, 89524, 203810], cuotas: [0, 1767, 6000, 28857] },
        quincenal: { nombre: 'Quincenal', tope: 1500, limites: [27500, 44762, 101905], cuotas: [0, 883, 3000, 14428] },
        semanal: { nombre: 'Semanal', tope: 750, limites: [13750, 22381, 50952], cuotas: [0, 442, 1500, 7214] }
    };
    function centavos(valor) {
        if (!['string', 'number'].includes(typeof valor)) throw new Error('Ingrese un monto válido');
        const texto = String(valor).trim();
       if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) {
    throw new Error(
        "Ingrese un número no negativo con máximo dos decimales"
    );
}
        const [entero, decimal = ''] = texto.split('.');
        const resultado = Number(entero) * 100 + Number(decimal.padEnd(2, '0'));
        if (!Number.isSafeInteger(resultado) || resultado > MAXIMO) throw new Error('El monto supera 9999999999.99');
        return resultado;
    }
    function decimal(valor) {
        return `${Math.floor(valor / 100)}.${String(valor % 100).padStart(2, '0')}`;
    }
    function porcentaje(base, puntosBasicos) {
        return Number((BigInt(base) * BigInt(puntosBasicos) + 5000n) / 10000n);
    }
    function calcularRenta(base, periodo) {
        const tabla = Object.hasOwn(PERIODOS, periodo) ? PERIODOS[periodo] : null;
        if (!tabla) throw new Error('Seleccione la frecuencia de pago');
        if (!Number.isSafeInteger(base) || base < 0 || base > MAXIMO) throw new Error('Base de renta inválida');
        let indice = tabla.limites.findIndex(limite => base <= limite);
        if (indice === -1) indice = 3;
        const tasa = [0, 1000, 2000, 3000][indice];
        const exceso = indice ? tabla.limites[indice - 1] : 0;
        return {
            tramo: ['I', 'II', 'III', 'IV'][indice], tasa: decimal(tasa),
            exceso_desde: decimal(exceso), cuota_fija: decimal(tabla.cuotas[indice]),
            centavos: indice ? porcentaje(base - exceso, tasa) + tabla.cuotas[indice] : 0
        };
    }
    function calcular(datos) {
        const tabla = Object.hasOwn(PERIODOS, datos.periodo_pago) ? PERIODOS[datos.periodo_pago] : null;
        if (!tabla) throw new Error('Seleccione la frecuencia de pago');
        const mes = Number(datos.mes), anio = Number(datos.anio);
        if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(anio) || anio < 1000 || anio > 9999) {
            throw new Error('Seleccione un mes y un año válido de cuatro cifras');
        }
        if (anio * 100 + mes < 202505) {
            throw new Error('No se pueden calcular las deducciones legales: falta configurar una regla');
        }
        const salario = centavos(datos.salario_base), adicionales = centavos(datos.ingresos_adicionales);
        const bruto = salario + adicionales;
        if (bruto > MAXIMO) throw new Error('La suma de ingresos supera 9999999999.99');
        const isss = Math.min(porcentaje(bruto, 300), tabla.tope);
        const afp = porcentaje(bruto, 725);
        const base = Math.max(0, bruto - isss - afp);
        const renta = calcularRenta(base, datos.periodo_pago);
        const detalle = [
            { codigo: 'ISSS', nombre: 'ISSS', base: decimal(bruto), tasa: '3.00', tramo: null, tope: decimal(tabla.tope), importe: decimal(isss) },
            { codigo: 'AFP', nombre: 'AFP', base: decimal(bruto), tasa: '7.25', tramo: null, tope: null, importe: decimal(afp) },
            {
                codigo: 'RENTA', nombre: 'Renta', base: decimal(base), tasa: renta.tasa, tramo: renta.tramo,
                tope: null, exceso_desde: renta.exceso_desde, cuota_fija: renta.cuota_fija, importe: decimal(renta.centavos)
            }
        ];
        return {
            version: VERSION, fuente: FUENTE, vigente_desde: '2025-05-01', periodo_pago: datos.periodo_pago,
            convencion_isss: 'mensual=30.00; quincenal=15.00; semanal=7.50; sin acumulación mensual',
            redondeo: 'Cada deducción a centavos; mitad hacia arriba',
            alcance_renta: 'Tabla directa por período; sin ajuste anual del tramo II ni recálculos de junio/diciembre',
            total_ingresos: decimal(bruto), base_renta: decimal(base), detalle,
            total: decimal(isss + afp + renta.centavos)
        };
    }
    function numeroMes(valor) {
    const meses = [
        "Enero", "Febrero", "Marzo", "Abril",
        "Mayo", "Junio", "Julio", "Agosto",
        "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const posicion = meses.indexOf(String(valor));

    if (posicion !== -1) {
        return posicion + 1;
    }

    const numero = Number(valor);

    return Number.isInteger(numero) && numero >= 1 && numero <= 12
        ? numero
        : null;
}

function calcularSalarioProporcional(salarioMensual, diasRemunerados) {
    const textoDias = String(diasRemunerados);

    if (!/^(?:[0-9]|[12][0-9]|30)$/.test(textoDias)) {
        throw new Error(
            "Los días remunerados deben ser enteros entre 0 y 30"
        );
    }

    const salarioCentavos = centavos(salarioMensual);
    const dias = Number(textoDias);

    const proporcionalCentavos = Number(
        (
            BigInt(salarioCentavos) * BigInt(dias) + 15n
        ) / 30n
    );

    return {
        salario_base_mensual: decimal(salarioCentavos),
        dias_remunerados: dias,
        salario_proporcional: decimal(proporcionalCentavos)
    };
}

function calcularPorDias(datos) {
    if (datos.periodo_pago !== "mensual") {
        throw new Error(
            "El cálculo por días requiere frecuencia mensual"
        );
    }

    const salario = calcularSalarioProporcional(
        datos.salario_base_mensual,
        datos.dias_remunerados
    );

    const deducciones = calcular({
        ...datos,
        salario_base: salario.salario_proporcional
    });

    return {
        ...deducciones,
        ...salario,
        modo_calculo: "dias",
        version_prorrateo: "HU19-30-dias-v1"
    };
}
   return Object.freeze({
    VERSION,
    FUENTE,
    centavos,
    decimal,
    calcular,
    calcularRenta,
    numeroMes,
    calcularSalarioProporcional,
    calcularPorDias
});
});
