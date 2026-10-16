document.addEventListener("DOMContentLoaded", () => {
    const identificadores = [
        "horas-ordinarias",
        "horas-extras"
    ];

    function prepararCampo(id) {
        const input = document.getElementById(id);

        if (!input) {
            throw new Error(`No se encontró el campo ${id}`);
        }

        let error = document.getElementById(`${id}-error`);

        if (!error) {
            error = document.createElement("div");
            error.id = `${id}-error`;
            error.className = "invalid-feedback";
            error.setAttribute("role", "alert");

            input.after(error);
        }

        input.setAttribute("aria-describedby", error.id);

        return { input, error };
    }

    const campos = identificadores.map(prepararCampo);

    function mensajeValidacion(valor) {
        const texto = valor.trim();

        if (!texto) {
            return "Este campo es obligatorio";
        }

        if (!/^\d+(?:\.\d{1,2})?$/.test(texto)) {
            return "Ingrese una cantidad mayor o igual a cero, con máximo dos decimales";
        }

        const [entero, decimal = ""] = texto.split(".");

        const centesimas =
            Number(entero) * 100 +
            Number(decimal.padEnd(2, "0"));

        if (
            !Number.isSafeInteger(centesimas) ||
            centesimas > 9999999999
        ) {
            return "Las horas no pueden superar 99999999.99";
        }

        return "";
    }

    function validarCampo({ input, error }) {
        const mensaje = mensajeValidacion(input.value);

        input.classList.toggle("is-invalid", Boolean(mensaje));
        input.setAttribute("aria-invalid", String(Boolean(mensaje)));

        error.textContent = mensaje;
        error.classList.toggle("d-block", Boolean(mensaje));

        return mensaje === "";
    }

    campos.forEach(campo => {
        campo.input.addEventListener(
            "input",
            () => validarCampo(campo)
        );

        campo.input.addEventListener(
            "blur",
            () => validarCampo(campo)
        );
    });

    window.validarHorasPlanilla = function () {
        let valido = true;

        campos.forEach(campo => {
            if (!validarCampo(campo)) {
                valido = false;
            }
        });

        return valido;
    };
});