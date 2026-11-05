// ARCHIVO: Total a pagar que se actualiza mientras se llena el formulario
// Buscar: total calculado, HU-34

import { calcularTotales } from "./totales-planilla.js";
import { prepararEntradasTotales } from "./entradas-totales-planilla.js";
import { obtenerDeduccionesLegales } from "./deducciones-legales.js";
import { obtenerSubtotalDescuentosManuales } from "./descuentos-detalle.js";
// Qué hace: Prepara el cálculo del total cuando carga la página
// Buscar: inicio total
document.addEventListener("DOMContentLoaded", () => {
    // HU-19: en la planilla por días se usa el salario proporcional.
    const salario = document.getElementById("salario-proporcional") ?? document.getElementById("salario");
    const ingresos = document.getElementById("ingresos");
    const descuentos = document.getElementById("descuentos");
    const total = document.getElementById("total-calculado");

    // Qué hace: Recalcula y muestra el total a pagar
    // Buscar: actualizarTotal, total-calculado
    function actualizarTotal() {
        try {
            const entradas = prepararEntradasTotales({
                salarioAplicable: salario.value,
                ingresosAdicionales: ingresos.value,
                deduccionesLegales: obtenerDeduccionesLegales()
            }, window.ReglasNomina);

            const descuentosManuales = obtenerSubtotalDescuentosManuales();

            const totales = calcularTotales({
                ...entradas,
                descuentosManuales
            });

            total.textContent = (totales.totalPagar / 100).toFixed(2);
        } catch {
            total.textContent = "—";
        }
    }

    [salario, ingresos, descuentos].forEach(campo => {
        // Qué hace: Recalcula al cambiar un monto
        // Buscar: input montos
        campo.addEventListener("input", actualizarTotal);
    });

    actualizarTotal();
});