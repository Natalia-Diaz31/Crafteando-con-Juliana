import {
    normalizarIngresos
} from "./ingresos-detalle.js";

export function prepararDuplicacion(datos, motor) {
    if (
        !datos?.empleado?.id ||
        !datos?.plantilla?.id ||
        !datos.plantilla.nombre ||
        !Array.isArray(datos.descuentos)
    ) {
        throw new Error(
            "Los datos recibidos para duplicar están incompletos"
        );
    }

    const ingresos = normalizarIngresos(
        datos.ingresos_detalle
    );

    const registrado =
        datos.empleado.salario_base_mensual;

    const salario =
        registrado == null || registrado === ""
            ? ""
            : motor.decimal(
                motor.centavos(registrado)
            );

    return {
        version_formato: 1,

        plantilla: {
            id: datos.plantilla.id,
            nombre: datos.plantilla.nombre
        },

        empleado: {
            id: datos.empleado.id
        },

        mes: "",
        anio: "",
        periodo_pago: "mensual",

        salario_base: salario,
        salario_original:
            salario === "" ? null : salario,

        motivo_ajuste: "",

        horas_ordinarias: "",
        horas_extras: "",

        ingresos_adicionales: ingresos.total,
        ingresos: ingresos.detalle,

        descuentos: datos.descuentos.map(item => ({
            concepto: item.concepto,
            importe: item.importe,
            origen: item.origen ?? "Manual"
        })),

        novedades: [],
        observaciones: ""
    };
}