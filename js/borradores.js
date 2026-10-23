import {
    obtenerNovedades,
    reemplazarNovedades,
    validarNovedadesFormulario
} from "./novedades.js";

import {
    normalizarIngresos,
    obtenerIngresos,
    reemplazarIngresos,
    validarIngresosPendientes
} from "./ingresos-detalle.js";

import {
    validarAjuste,
    obtenerAjusteSalario,
    restaurarAjusteSalario
} from "./salario-ajuste.js";

import {
    validarNovedades
} from "./novedades-reglas.js";

import {
    reemplazarDescuentosManuales
} from "./descuentos-detalle.js";

const CAMPOS = {
    mes: "mes",
    anio: "anio",
    periodo_pago: "periodo-pago",
    salario_base: "salario",
    ingresos_adicionales: "ingresos",
    horas_ordinarias: "horas-ordinarias",
    horas_extras: "horas-extras"
};

function leerSeleccion(clave) {
    try {
        return JSON.parse(sessionStorage.getItem(clave));
    } catch {
        throw new Error("La selección guardada es inválida");
    }
}

function validarDatosBorrador(datos) {
    const motor = globalThis.ReglasNomina;
    const errores = {};

    function comprobar(campo, accion) {
        try {
            accion();
        } catch (error) {
            errores[campo] = error.message;
        }
    }

    if (!datos.plantilla?.id) {
        errores.plantilla =
            "Seleccione una plantilla para guardar el borrador";
    }

    const mes = datos.mes === ""
        ? ""
        : motor.numeroMes(datos.mes);

    if (datos.mes !== "" && mes === null) {
        errores.mes = "Seleccione un mes válido";
    }

    if (
        datos.anio !== "" &&
        !/^[1-9]\d{3}$/.test(String(datos.anio))
    ) {
        errores.anio = "Ingrese un año de cuatro cifras";
    }

    if (
        datos.periodo_pago !== "" &&
        !["mensual", "quincenal", "semanal"].includes(
            datos.periodo_pago
        )
    ) {
        errores.periodo_pago =
            "Seleccione una frecuencia válida";
    }

    [
        "salario_base",
        "ingresos_adicionales",
        "horas_ordinarias",
        "horas_extras"
    ].forEach(campo => {
        const valor = datos[campo];

        if (valor !== "" && valor !== undefined && valor !== null) {
            comprobar(campo, () => {
                const cantidad = motor.centavos(valor);

                if (
                    campo.startsWith("horas_") &&
                    cantidad > 9999999999
                ) {
                    throw new Error(
                        "Las horas no pueden superar 99999999.99"
                    );
                }
            });
        }
    });

    if (datos.ingresos !== undefined) {
        comprobar("ingresos", () => {
            normalizarIngresos(datos.ingresos);
        });
    }

    comprobar("descuentos", () => {
        if (!Array.isArray(datos.descuentos)) {
            throw new Error("La lista de descuentos es inválida");
        }

        let suma = 0;

        datos.descuentos.forEach(item => {
            const concepto =
                typeof item?.concepto === "string"
                    ? item.concepto.trim()
                    : "";

            if (
                !concepto ||
                ["isss", "afp", "renta"].includes(
                    concepto.toLowerCase()
                )
            ) {
                throw new Error(
                    "Ingrese un concepto de descuento manual válido"
                );
            }

            const importe = motor.centavos(item.importe);

            if (importe <= 0) {
                throw new Error(
                    "Los descuentos deben ser mayores que cero"
                );
            }

            suma += importe;
        });

        motor.centavos(motor.decimal(suma));
    });

    const novedades = validarNovedades(
        datos.novedades ?? [],
        {
            mes,
            anio: datos.anio,
            frecuencia: datos.periodo_pago
        }
    );

    if (!novedades.valido) {
        errores.novedades = novedades.errores.join(". ");
    }

    comprobar("motivo_ajuste", () => {
        validarAjuste({
            original: datos.salario_original,
            utilizado: datos.salario_base,
            motivo: datos.motivo_ajuste ?? ""
        }, false);
    });

    return {
        valido: Object.keys(errores).length === 0,
        errores
    };
}

export function capturarBorrador() {
    if (
        !validarNovedadesFormulario() ||
        !validarIngresosPendientes() ||
        !globalThis.validarDetalleDescuentos()
    ) {
        return {
            valido: false,
            errores: {
                detalle:
                    "Confirme los registros pendientes antes de guardar"
            },
            contenido: null
        };
    }

    let ajuste;

    try {
        ajuste = obtenerAjusteSalario(false);
    } catch (error) {
        return {
            valido: false,
            errores: { salario: error.message },
            contenido: null
        };
    }

    const campos = Object.fromEntries(
        Object.entries(CAMPOS).map(([nombre, id]) => [
            nombre,
            document.getElementById(id)?.value ?? ""
        ])
    );

    const contenido = {
        version_formato: 1,
        ...campos,
        plantilla: leerSeleccion("plantillaSeleccionada"),
        empleado: leerSeleccion("empleadoSeleccionado"),
        salario_original: ajuste?.salario_original ?? null,
        motivo_ajuste: ajuste?.motivo_ajuste ?? "",
        ingresos: obtenerIngresos()?.detalle,
        descuentos: globalThis.obtenerDetalleDescuentos(),
        novedades: obtenerNovedades()
    };

    const resultado = validarDatosBorrador(contenido);

    return {
        ...resultado,
        contenido: resultado.valido
            ? structuredClone(contenido)
            : null
    };
}

function recuperarEmpleado(empleado) {
    return new Promise((resolver, rechazar) => {
        document.dispatchEvent(
            new CustomEvent("empleado:recuperar", {
                detail: {
                    empleado,
                    resolver,
                    rechazar
                }
            })
        );
    });
}

export async function recuperarBorrador(contenido) {
    if (contenido?.version_formato !== 1) {
        throw new Error("Versión de borrador no admitida");
    }

    const resultado = validarDatosBorrador(contenido);

    if (!resultado.valido) {
        throw new Error(
            Object.values(resultado.errores).join(". ")
        );
    }

    if (
        contenido.ingresos !== undefined &&
        obtenerIngresos() === null
    ) {
        throw new Error(
            "Integre el formulario de ingresos antes de recuperar este borrador"
        );
    }

    if (
        contenido.motivo_ajuste &&
        !document.getElementById("salario-motivo")
    ) {
        throw new Error(
            "Integre el formulario de ajuste salarial"
        );
    }

    await recuperarEmpleado(contenido.empleado);

    sessionStorage.setItem(
        "plantillaSeleccionada",
        JSON.stringify(contenido.plantilla)
    );

    for (const [nombre, id] of Object.entries(CAMPOS)) {
        const campo = document.getElementById(id);

        if (!campo) continue;

        if (nombre === "mes" && contenido.mes !== "") {
            const mes = globalThis.ReglasNomina.numeroMes(
                contenido.mes
            );

            campo.selectedIndex = mes;
        } else {
            campo.value = contenido[nombre] ?? "";
        }
    }

    restaurarAjusteSalario(contenido);
    reemplazarNovedades(contenido.novedades ?? []);
    reemplazarDescuentosManuales(contenido.descuentos);

    if (contenido.ingresos !== undefined) {
        reemplazarIngresos(contenido.ingresos);
    }

    [
        "salario",
        "ingresos",
        "periodo-pago",
        "mes",
        "anio"
    ].forEach(id => {
        document.getElementById(id)?.dispatchEvent(
            new Event("input", { bubbles: true })
        );
    });

    document.dispatchEvent(
        new CustomEvent("planilla:nueva")
    );

    document.dispatchEvent(
        new CustomEvent("planilla:modificada")
    );
}