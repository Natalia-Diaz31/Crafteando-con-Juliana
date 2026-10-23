const TIPOS = ["Incapacidad", "Permiso", "Ausencia"];
const CONDICIONES = ["Con goce", "Sin goce"];
const MILISEGUNDOS_DIA = 86400000;

function convertirFecha(texto) {
    if (
        typeof texto !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(texto)
    ) {
        throw new Error("Ingrese una fecha válida");
    }

    const fecha = new Date(`${texto}T00:00:00Z`);

    if (
        !Number.isFinite(fecha.getTime()) ||
        fecha.toISOString().slice(0, 10) !== texto
    ) {
        throw new Error("Ingrese una fecha válida");
    }

    return fecha;
}

export function contarDias(fechaInicio, fechaFin) {
    const inicio = convertirFecha(fechaInicio);
    const fin = convertirFecha(fechaFin);

    if (fin < inicio) {
        throw new Error(
            "La fecha de finalización no puede ser anterior a la de inicio"
        );
    }

    return (fin - inicio) / MILISEGUNDOS_DIA + 1;
}

export function validarNovedades(lista, periodo) {
    const errores = [];
    const normalizadas = [];

    if (!Array.isArray(lista)) {
        return {
            valido: false,
            errores: ["La lista de novedades es inválida"],
            novedades: [],
            diasRemunerados: null
        };
    }

    const periodoValido =
        Number.isInteger(periodo.mes) &&
        periodo.mes >= 1 &&
        periodo.mes <= 12 &&
        /^[1-9]\d{3}$/.test(String(periodo.anio)) &&
        periodo.frecuencia === "mensual";

    if (lista.length > 0 && !periodoValido) {
        errores.push(
            "Seleccione un mes, un año y frecuencia mensual para las novedades"
        );
    }

    let diasSinGoce = 0;

    lista.forEach((novedad, indice) => {
        try {
            if (!novedad || !TIPOS.includes(novedad.tipo)) {
                throw new Error("Seleccione un tipo de novedad válido");
            }

            if (!CONDICIONES.includes(novedad.condicion)) {
                throw new Error("Seleccione la condición de pago");
            }

            const dias = contarDias(
                novedad.fechaInicio,
                novedad.fechaFin
            );

            const prefijo =
                `${periodo.anio}-${String(periodo.mes).padStart(2, "0")}-`;

            if (
                !novedad.fechaInicio.startsWith(prefijo) ||
                !novedad.fechaFin.startsWith(prefijo)
            ) {
                throw new Error(
                    "Las fechas deben pertenecer al mes y año de la planilla"
                );
            }

            const seSuperpone = lista
                .slice(0, indice)
                .some(anterior =>
                    anterior &&
                    novedad.fechaInicio <= anterior.fechaFin &&
                    novedad.fechaFin >= anterior.fechaInicio
                );

            if (seSuperpone) {
                throw new Error(
                    "Las fechas se superponen con otra novedad"
                );
            }

            normalizadas.push({
                tipo: novedad.tipo,
                condicion: novedad.condicion,
                fechaInicio: novedad.fechaInicio,
                fechaFin: novedad.fechaFin,
                dias
            });

            if (novedad.condicion === "Sin goce") {
                diasSinGoce += dias;
            }
        } catch (error) {
            errores.push(
                `Novedad ${indice + 1}: ${error.message}`
            );
        }
    });

    if (diasSinGoce > 30) {
        errores.push("Los días sin goce no pueden superar 30");
    }

    return {
        valido: errores.length === 0,
        errores,
        novedades: normalizadas,
        diasRemunerados: errores.length
            ? null
            : 30 - diasSinGoce
    };
}