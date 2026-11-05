// ARCHIVO: Salario proporcional a los días remunerados (planillas mensuales)
// Buscar: salario por días, proporcional, HU-19

// HU-19: cuando la página tiene el campo «salario-proporcional», la planilla mensual
// se calcula por días: salario base mensual × días remunerados ÷ 30.
// El resto del formulario lee el salario del pago desde ese campo.
import { obtenerEstadoNovedades } from "./novedades.js";

// Qué hace: Busca un elemento por id
// Buscar: campo
const campo = id => document.getElementById(id);

// Qué hace: Indica si la planilla se calcula por días (solo mensual)
// Buscar: esPlanillaPorDias, modo_calculo
export function esPlanillaPorDias() {
    return Boolean(campo("salario-proporcional")) &&
        campo("periodo-pago").value === "mensual";
}

// Qué hace: Calcula y muestra el salario proporcional
// Buscar: actualizarSalarioProporcional
function actualizarSalarioProporcional() {
    let valor = campo("salario").value;

    if (esPlanillaPorDias()) {
        try {
            valor = globalThis.ReglasNomina.calcularSalarioProporcional(
                valor,
                obtenerEstadoNovedades().diasRemunerados
            ).salario_proporcional;
        } catch {
            valor = "";
        }
    }

    const proporcional = campo("salario-proporcional");
    if (proporcional.value === valor) return;

    proporcional.value = valor;
    proporcional.dispatchEvent(new Event("input", { bubbles: true }));
}

// Qué hace: Recalcula al cambiar salario, frecuencia o novedades
// Buscar: inicio salario por días
document.addEventListener("DOMContentLoaded", () => {
    if (!campo("salario-proporcional")) return;

    campo("salario-proporcional").readOnly = true;

    ["salario", "periodo-pago"].forEach(id =>
        ["input", "change"].forEach(evento =>
            campo(id).addEventListener(evento, actualizarSalarioProporcional)
        )
    );
    // Qué hace: Recalcula cuando cambian las novedades
    // Buscar: planilla:modificada
    document.addEventListener("planilla:modificada", actualizarSalarioProporcional);

    actualizarSalarioProporcional();
});
