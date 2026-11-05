// ARCHIVO: Formato del período de una planilla
// Buscar: período, mes, año

"use strict";

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Mostrar el período igual que en el resumen: "Octubre 2026"
// Qué hace: Convierte mes y año en texto, por ejemplo «Octubre 2026»
// Buscar: formatearPeriodo
function formatearPeriodo(mes, anio) {
    return `${MESES[mes - 1] || mes} ${anio}`;
}

module.exports = { formatearPeriodo };
