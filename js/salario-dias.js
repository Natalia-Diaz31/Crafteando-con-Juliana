// HU-19: cuando la página tiene el campo «salario-proporcional», la planilla mensual
// se calcula por días: salario base mensual × días remunerados ÷ 30.
// El resto del formulario lee el salario del pago desde ese campo (docs/contrato-integracion-sprint3.md).
import { obtenerEstadoNovedades } from "./novedades.js";

const campo = id => document.getElementById(id);

export function esPlanillaPorDias() {
    return Boolean(campo("salario-proporcional")) &&
        campo("periodo-pago").value === "mensual";
}

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

document.addEventListener("DOMContentLoaded", () => {
    if (!campo("salario-proporcional")) return;

    campo("salario-proporcional").readOnly = true;

    ["salario", "periodo-pago"].forEach(id =>
        ["input", "change"].forEach(evento =>
            campo(id).addEventListener(evento, actualizarSalarioProporcional)
        )
    );
    document.addEventListener("planilla:modificada", actualizarSalarioProporcional);

    actualizarSalarioProporcional();
});
