"use strict";

const ReglasNomina = require("./reglas-nomina.js");

const MAXIMO_CENTAVOS =
    ReglasNomina.centavos("9999999999.99");

function obtenerTexto(valor) {
    if (typeof valor === "string") {
        return valor.trim();
    }

    if (typeof valor === "number" && Number.isFinite(valor)) {
        return String(valor);
    }

    return "";
}

function validarSalarioEIngresos(datos) {
    const errores = {};

    function leerMonto(campo) {
        const texto = obtenerTexto(datos[campo]);

        if (!texto) {
            errores[campo] = "Este campo es obligatorio";
            return null;
        }

        try {
            return ReglasNomina.centavos(texto);
        } catch {
            errores[campo] = /^\d+(?:\.\d{1,2})?$/.test(texto)
                ? "El monto no puede superar 9999999999.99"
                : "Ingrese un número mayor o igual a cero, con máximo dos decimales";

            return null;
        }
    }

    const salario = leerMonto(
        datos.modo_calculo === "dias"
            ? "salario_base_mensual"
            : "salario_base"
    );

    let ingresos = null;
    let ingresosDetalle = null;

    if (datos.ingresos_detalle === undefined) {
        ingresos = leerMonto("ingresos_adicionales");
    } else if (!Array.isArray(datos.ingresos_detalle)) {
        errores.ingresos_detalle =
            "Los ingresos deben enviarse como una lista";
    } else {
        ingresosDetalle = [];
        let suma = 0;

        for (const item of datos.ingresos_detalle) {
            if (
                !item ||
                typeof item !== "object" ||
                Array.isArray(item)
            ) {
                errores.ingresos_detalle =
                    "Registro de ingreso inválido";
                break;
            }

            if (!["Bono", "Incentivo"].includes(item.tipo)) {
                errores.ingresos_detalle =
                    "Seleccione Bono o Incentivo";
                break;
            }

            const concepto = typeof item.concepto === "string"
                ? item.concepto.trim()
                : "";

            if (!concepto || concepto.length > 100) {
                errores.ingresos_detalle =
                    "El concepto debe tener entre 1 y 100 caracteres";
                break;
            }

            const texto = obtenerTexto(item.importe);
            let centavos;

            try {
                centavos = ReglasNomina.centavos(texto);
            } catch {
                errores.ingresos_detalle =
                    /^\d+(?:\.\d{1,2})?$/.test(texto)
                        ? "Importe fuera del rango permitido"
                        : "Importe inválido";

                break;
            }

            if (
                centavos <= 0 ||
                suma + centavos > MAXIMO_CENTAVOS
            ) {
                errores.ingresos_detalle =
                    "Importe fuera del rango permitido";
                break;
            }

            const origen = item.origen ?? "Manual";

            if (!["Manual", "CSV"].includes(origen)) {
                errores.ingresos_detalle =
                    "Origen de ingreso inválido";
                break;
            }

            suma += centavos;

            ingresosDetalle.push({
                tipo: item.tipo,
                concepto,
                importe: ReglasNomina.decimal(centavos),
                origen
            });
        }

        if (!errores.ingresos_detalle) {
            ingresos = suma;
        }
    }

    return {
        salario,
        ingresos,
        ingresosDetalle,
        errores
    };
}

module.exports = { validarSalarioEIngresos };