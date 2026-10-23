const ENCABEZADOS = [
    "codigo_empleado",
    "mes",
    "anio",
    "tipo",
    "concepto",
    "importe"
];

const MAXIMO_BYTES = 1000000;

export function analizarCSV(contenido) {
    const texto = contenido.replace(/^\uFEFF/, "");

    const filas = [];

    let valores = [];
    let celda = "";
    let estado = "inicio";
    let linea = 1;
    let inicioFila = 1;
    let pendiente = false;

    function agregarCelda() {
        valores.push(celda);
        celda = "";
        estado = "inicio";
    }

    function agregarFila() {
        agregarCelda();

        filas.push({
            numeroFila: inicioFila,
            valores
        });

        valores = [];
        pendiente = false;
    }

    for (let i = 0; i < texto.length; i++) {
        const caracter = texto[i];

        if (estado === "comillas") {
            if (caracter === '"') {
                if (texto[i + 1] === '"') {
                    celda += '"';
                    i++;
                } else {
                    estado = "cerrado";
                }
            } else {
                celda += caracter;

                if (
                    caracter === "\n" ||
                    (
                        caracter === "\r" &&
                        texto[i + 1] !== "\n"
                    )
                ) {
                    linea++;
                }
            }

            pendiente = true;
            continue;
        }

        if (caracter === ",") {
            agregarCelda();
            pendiente = true;
            continue;
        }

        if (caracter === "\n" || caracter === "\r") {
            agregarFila();

            if (
                caracter === "\r" &&
                texto[i + 1] === "\n"
            ) {
                i++;
            }

            linea++;
            inicioFila = linea;
            continue;
        }

        if (estado === "cerrado") {
            throw new Error(
                `Fila ${linea}: hay texto después de cerrar comillas`
            );
        }

        if (caracter === '"') {
            if (estado !== "inicio") {
                throw new Error(
                    `Fila ${linea}: comillas mal colocadas`
                );
            }

            estado = "comillas";
            pendiente = true;
            continue;
        }

        celda += caracter;
        estado = "texto";
        pendiente = true;
    }

    if (estado === "comillas") {
        throw new Error(
            `Fila ${inicioFila}: faltan comillas de cierre`
        );
    }

    if (pendiente || valores.length || celda) {
        agregarFila();
    }

    const cabecera = filas.shift();

    if (
        !cabecera ||
        JSON.stringify(cabecera.valores) !==
        JSON.stringify(ENCABEZADOS)
    ) {
        return {
            valido: false,
            filas: [],
            errores: [{
                fila: 1,
                campo: "encabezados",
                motivo: `Use: ${ENCABEZADOS.join(",")}`
            }]
        };
    }

    const errores = [];
    const registros = [];

    if (filas.length === 0 || filas.length > 100) {
        errores.push({
            fila: null,
            campo: "archivo",
            motivo: "El archivo debe contener entre 1 y 100 filas de datos"
        });
    }

    filas.forEach(fila => {
        if (fila.valores.length !== ENCABEZADOS.length) {
            errores.push({
                fila: fila.numeroFila,
                campo: "estructura",
                motivo: "La fila debe contener seis columnas"
            });

            return;
        }

        registros.push({
            numeroFila: fila.numeroFila,
            ...Object.fromEntries(
                ENCABEZADOS.map((nombre, indice) => [
                    nombre,
                    fila.valores[indice]
                ])
            )
        });
    });

    return {
        valido: errores.length === 0,
        filas: registros,
        errores
    };
}

export async function leerArchivoCSV(archivo) {
    if (!archivo || !/\.csv$/i.test(archivo.name)) {
        throw new Error("Seleccione un archivo .csv");
    }

    if (!archivo.size || archivo.size > MAXIMO_BYTES) {
        throw new Error(
            "El archivo debe tener contenido y no superar 1 MB"
        );
    }

    let texto;

    try {
        const bytes = await archivo.arrayBuffer();

        texto = new TextDecoder("utf-8", {
            fatal: true
        }).decode(bytes);
    } catch {
        throw new Error(
            "El archivo debe estar codificado en UTF-8 y poder leerse"
        );
    }

    return analizarCSV(texto);
}