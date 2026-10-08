document.addEventListener("DOMContentLoaded", () => {
    function marcarCampo(id, mensaje) {
        const campo = document.getElementById(id);
        const error = document.getElementById(`${id}-error`);

        campo.classList.toggle("is-invalid", mensaje !== "");
        campo.setAttribute("aria-invalid", String(mensaje !== ""));
        campo.setAttribute("aria-describedby", error.id);

        error.textContent = mensaje;
        error.classList.toggle("d-block", mensaje !== "");
    }

    window.validarObligatoriosPlanilla = function () {
        let valido = true;

        [
            ["mes", "Seleccione el mes"],
            ["anio", "Ingrese el año"]
        ].forEach(([id, mensaje]) => {
            const vacio = document.getElementById(id).value.trim() === "";
            marcarCampo(id, vacio ? mensaje : "");

            if (vacio) valido = false;
        });

        ["salario", "ingresos", "descuentos"].forEach((id) => {
            const vacio = document.getElementById(id).value.trim() === "";

            // Los errores de formato siguen a cargo de planilla.js.
            if (vacio) {
                marcarCampo(id, "Este campo es obligatorio");
                valido = false;
            }
        });

        return valido;
    };

    ["mes", "anio"].forEach((id) => {
        document.getElementById(id).addEventListener("input", () => {
            marcarCampo(id, "");
        });
    });
});