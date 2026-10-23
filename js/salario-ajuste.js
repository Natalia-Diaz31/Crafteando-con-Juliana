let salarioOriginal = null;
let controles = null;

const motor = () => globalThis.ReglasNomina;

export function validarAjuste(datos, obligatorio = true) {
    const sinOriginal =
        datos.original === null ||
        datos.original === undefined ||
        datos.original === "";

    const originalCentavos = sinOriginal
        ? null
        : motor().centavos(datos.original);

    const motivo =
        typeof datos.motivo === "string"
            ? datos.motivo.trim()
            : "";

    const vacio =
        datos.utilizado === "" ||
        datos.utilizado === null ||
        datos.utilizado === undefined;

    if (vacio) {
        if (obligatorio) {
            throw new Error(
                "Ingrese el salario base mensual del empleado"
            );
        }

        return {
            salario_original: sinOriginal
                ? null
                : motor().decimal(originalCentavos),
            salario_utilizado: "",
            motivo_ajuste: "",
            ajustado: false
        };
    }

    const utilizadoCentavos = motor().centavos(datos.utilizado);

    const ajustado =
        !sinOriginal &&
        originalCentavos !== utilizadoCentavos;

    if (
        motivo.length > 200 ||
        (ajustado && motivo.length === 0)
    ) {
        throw new Error(
            "El motivo del ajuste debe tener entre 1 y 200 caracteres"
        );
    }

    return {
        salario_original: sinOriginal
            ? null
            : motor().decimal(originalCentavos),
        salario_utilizado: motor().decimal(utilizadoCentavos),
        motivo_ajuste: ajustado ? motivo : "",
        ajustado
    };
}

export function obtenerAjusteSalario(obligatorio = true) {
    if (!controles) return null;

    return validarAjuste({
        original: salarioOriginal,
        utilizado: controles.salario.value,
        motivo: controles.motivo.value
    }, obligatorio);
}

export function validarAjusteFormulario() {
    if (!controles) return true;

    try {
        obtenerAjusteSalario();
        controles.error.textContent = "";
        return true;
    } catch (error) {
        controles.error.textContent = error.message;
        return false;
    }
}

export function restaurarAjusteSalario(datos) {
    if (!controles) {
        if (datos.motivo_ajuste) {
            throw new Error(
                "Falta integrar el formulario de ajuste salarial"
            );
        }

        return;
    }

    controles.salario.value = datos.salario_base;
    controles.motivo.value = datos.motivo_ajuste ?? "";

    controles.salario.dispatchEvent(
        new Event("input", { bubbles: true })
    );
}

function actualizarMensaje() {
    try {
        const resultado = obtenerAjusteSalario(false);

        controles.mensaje.textContent =
            salarioOriginal === null
                ? "Ingrese el salario base mensual del empleado"
                : resultado.ajustado
                    ? "Salario ajustado para esta planilla"
                    : "Salario tomado del registro del empleado";

        controles.error.textContent = "";
    } catch (error) {
        controles.error.textContent = error.message;
    }
}

function cargarSalarioEmpleado() {
    let empleado = null;

    try {
        empleado = JSON.parse(
            sessionStorage.getItem("empleadoSeleccionado")
        );
    } catch {
        empleado = null;
    }

    salarioOriginal = empleado?.salario_base_mensual ?? null;

    controles.motivo.value = "";

    try {
        controles.salario.value =
            salarioOriginal === null
                ? ""
                : motor().decimal(
                    motor().centavos(salarioOriginal)
                );
    } catch (error) {
        salarioOriginal = null;
        controles.salario.value = "";
        controles.error.textContent = error.message;
    }

    controles.salario.dispatchEvent(
        new Event("input", { bubbles: true })
    );

    actualizarMensaje();

    document.dispatchEvent(
        new CustomEvent("planilla:modificada")
    );
}

function iniciarAjuste() {
    const buscar = id => document.getElementById(id);

    if (!buscar("salario-motivo")) return;

    const elementos = {
        salario: buscar("salario"),
        motivo: buscar("salario-motivo"),
        mensaje: buscar("salario-origen"),
        error: buscar("salario-ajuste-error"),
        restaurar: buscar("restaurar-salario")
    };

    if (!Object.values(elementos).every(Boolean)) {
        console.error("Faltan controles del ajuste salarial");
        return;
    }

    controles = elementos;

    controles.salario.addEventListener(
        "input",
        actualizarMensaje
    );

    controles.motivo.addEventListener("input", () => {
        document.dispatchEvent(
            new CustomEvent("planilla:modificada")
        );
    });

    controles.restaurar.addEventListener("click", () => {
        controles.salario.value =
            salarioOriginal === null
                ? ""
                : motor().decimal(
                    motor().centavos(salarioOriginal)
                );

        controles.motivo.value = "";

        controles.salario.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        actualizarMensaje();

        document.dispatchEvent(
            new CustomEvent("planilla:modificada")
        );
    });

    document.addEventListener(
        "empleado:actualizado",
        cargarSalarioEmpleado
    );

    cargarSalarioEmpleado();
}

document.addEventListener("DOMContentLoaded", iniciarAjuste);