import { calcularTotales } from "./totales-planilla.js";
import { prepararEntradasTotales } from "./entradas-totales-planilla.js";
import { obtenerDeduccionesLegales } from "./deducciones-legales.js";
import { obtenerSubtotalDescuentosManuales } from "./descuentos-detalle.js";
document.addEventListener("DOMContentLoaded", () => {
    // HU-19: en la planilla por días se usa el salario proporcional.
    const salario = document.getElementById("salario-proporcional") ?? document.getElementById("salario");
    const ingresos = document.getElementById("ingresos");
    const descuentos = document.getElementById("descuentos");
    const total = document.getElementById("total-calculado");

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
        campo.addEventListener("input", actualizarTotal);
    });

    actualizarTotal();
});