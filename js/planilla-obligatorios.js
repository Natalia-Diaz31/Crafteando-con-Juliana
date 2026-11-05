// ARCHIVO: Validación de campos obligatorios de la planilla
// Buscar: obligatorios, mes, año, HU-35

"use strict";

// HU-35: interfaz exportada para validar campos obligatorios.
// Las reglas originales permanecen dentro del componente.

let validarObligatoriosInterno = null;

// Qué hace: Valida los campos obligatorios (interfaz para la revisión)
// Buscar: validarObligatoriosPlanilla
export function validarObligatoriosPlanilla() {
    if (!validarObligatoriosInterno) {
        throw new Error(
            "El componente de campos obligatorios todavía no está listo"
        );
    }

    return validarObligatoriosInterno();
}

// Qué hace: Prepara la validación cuando carga la página
// Buscar: inicio obligatorios
document.addEventListener("DOMContentLoaded", () => {
    // Qué hace: Muestra u oculta el error de un campo
    // Buscar: marcarCampo
    function marcarCampo(id, mensaje) {
        const campo = document.getElementById(id);
        const error = document.getElementById(`${id}-error`);

        campo.classList.toggle("is-invalid", mensaje !== "");
        campo.setAttribute("aria-invalid", String(mensaje !== ""));
        campo.setAttribute("aria-describedby", error.id);

        error.textContent = mensaje;
        error.classList.toggle("d-block", mensaje !== "");
    }

    // Qué hace: Revisa que mes, año, salario, ingresos y descuentos tengan valor
    // Buscar: validarCamposObligatorios
    function validarCamposObligatorios() {
        let valido = true;

        [
            ["mes", "Seleccione el mes"],
            ["anio", "Ingrese el año"]
        ].forEach(([id, mensaje]) => {
            const vacio =
                document.getElementById(id).value.trim() === "";

            marcarCampo(id, vacio ? mensaje : "");

            if (vacio) {
                valido = false;
            }
        });

        ["salario", "ingresos", "descuentos"].forEach(id => {
            const vacio =
                document.getElementById(id).value.trim() === "";

            // Los errores de formato siguen a cargo de planilla.js.
            if (vacio) {
                marcarCampo(id, "Este campo es obligatorio");
                valido = false;
            }
        });

        return valido;
    }

    validarObligatoriosInterno = validarCamposObligatorios;

    // Compatibilidad con los componentes existentes.
    window.validarObligatoriosPlanilla =
        validarObligatoriosPlanilla;

    ["mes", "anio"].forEach(id => {
        document.getElementById(id).addEventListener("input", () => {
            marcarCampo(id, "");
        });
    });
});
