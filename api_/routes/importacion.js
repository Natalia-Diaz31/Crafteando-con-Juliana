
const express = require("express");

const TIPOS = ["bono", "incentivo", "descuento"];
const RESERVADOS = ["isss", "afp", "renta"];
const MAXIMO_CENTAVOS = 999999999999;

function crearRutasImportacion({
    supabase,
    verificarToken,
    verificarRolNomina
}) {
    const router = express.Router();

    router.post(
        "/validar-importacion",
        verificarToken,
        verificarRolNomina,
        async (req, res) => {
            try {
                const { empleado_id, mes, anio, filas } = req.body || {};
                const errores = [];

                const mesNumero = Number(mes);
                const anioNumero = Number(anio);

                if (
                    typeof empleado_id !== "string" ||
                    !empleado_id.trim()
                ) {
                    errores.push({
                        fila: null,
                        campo: "empleado_id",
                        motivo: "Debe seleccionar un empleado"
                    });
                }

                if (
                    !Number.isInteger(mesNumero) ||
                    mesNumero < 1 ||
                    mesNumero > 12
                ) {
                    errores.push({
                        fila: null,
                        campo: "mes",
                        motivo: "Seleccione un mes válido"
                    });
                }

                if (
                    !Number.isInteger(anioNumero) ||
                    anioNumero < 1
                ) {
                    errores.push({
                        fila: null,
                        campo: "anio",
                        motivo: "Seleccione un año válido"
                    });
                }

                if (
                    !Array.isArray(filas) ||
                    filas.length < 1 ||
                    filas.length > 100
                ) {
                    errores.push({
                        fila: null,
                        campo: "filas",
                        motivo: "Debe enviar entre 1 y 100 filas"
                    });
                }

                if (errores.length) {
                    return res.status(400).json({
                        ok: false,
                        valido: false,
                        filas: [],
                        errores
                    });
                }

                const { data: empleado, error: errorEmpleado } =
                    await supabase
                        .from("empleados")
                        .select("id, codigo")
                        .eq("id", empleado_id.trim())
                        .maybeSingle();

                if (errorEmpleado) throw errorEmpleado;

                if (!empleado) {
                    return res.status(404).json({
                        ok: false,
                        valido: false,
                        filas: [],
                        errores: [{
                            fila: null,
                            campo: "empleado_id",
                            motivo: "El empleado no existe"
                        }]
                    });
                }

                const registros = [];
                let ingresosCentavos = 0;
                let descuentosCentavos = 0;

                filas.forEach((fila, indice) => {
                    const numeroFila =
                        Number.isInteger(fila?.numeroFila)
                            ? fila.numeroFila
                            : indice + 2;

                    const erroresAntes = errores.length;

                    function agregarError(campo, motivo) {
                        errores.push({
                            fila: numeroFila,
                            campo,
                            motivo
                        });
                    }

                    if (
                        !fila ||
                        typeof fila !== "object" ||
                        Array.isArray(fila)
                    ) {
                        agregarError("fila", "Registro inválido");
                        return;
                    }

                    if (
                        String(fila.codigo_empleado ?? "").trim() !==
                        String(empleado.codigo ?? "").trim()
                    ) {
                        agregarError(
                            "codigo_empleado",
                            "No corresponde al empleado seleccionado"
                        );
                    }

                    if (
                        !/^\d{1,2}$/.test(String(fila.mes ?? "").trim()) ||
                        Number(fila.mes) !== mesNumero
                    ) {
                        agregarError(
                            "mes",
                            "No corresponde al mes seleccionado"
                        );
                    }

                    if (
                        !/^\d{4}$/.test(String(fila.anio ?? "").trim()) ||
                        Number(fila.anio) !== anioNumero
                    ) {
                        agregarError(
                            "anio",
                            "No corresponde al año seleccionado"
                        );
                    }

                    const tipo =
                        typeof fila.tipo === "string"
                            ? fila.tipo.trim().toLowerCase()
                            : "";

                    if (!TIPOS.includes(tipo)) {
                        agregarError(
                            "tipo",
                            "Use bono, incentivo o descuento"
                        );
                    }

                    const concepto =
                        typeof fila.concepto === "string"
                            ? fila.concepto.trim()
                            : "";

                    if (
                        concepto.length < 1 ||
                        concepto.length > 100
                    ) {
                        agregarError(
                            "concepto",
                            "Debe tener entre 1 y 100 caracteres"
                        );
                    }

                    const conceptoNormalizado = concepto
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase();

                    if (
                        tipo === "descuento" &&
                        RESERVADOS.includes(conceptoNormalizado)
                    ) {
                        agregarError(
                            "concepto",
                            "ISSS, AFP y renta son deducciones automáticas"
                        );
                    }

                    const importeTexto =
                        typeof fila.importe === "string" ||
                        typeof fila.importe === "number"
                            ? String(fila.importe).trim()
                            : "";

                    let centavos = null;

                    if (!/^\d+(?:\.\d{1,2})?$/.test(importeTexto)) {
                        agregarError(
                            "importe",
                            "Debe ser positivo y tener máximo dos decimales"
                        );
                    } else {
                        const [entero, decimal = ""] =
                            importeTexto.split(".");

                        centavos =
                            Number(entero) * 100 +
                            Number(decimal.padEnd(2, "0"));

                        if (
                            !Number.isSafeInteger(centavos) ||
                            centavos <= 0 ||
                            centavos > MAXIMO_CENTAVOS
                        ) {
                            agregarError(
                                "importe",
                                "Debe ser mayor que cero y no superar 9999999999.99"
                            );
                        }
                    }

                    if (errores.length !== erroresAntes) return;

                    registros.push({
                        numeroFila,
                        tipo,
                        concepto,
                        importe: (centavos / 100).toFixed(2),
                        origen: "CSV"
                    });

                    if (tipo === "descuento") {
                        descuentosCentavos += centavos;
                    } else {
                        ingresosCentavos += centavos;
                    }
                });

                if (
                    ingresosCentavos > MAXIMO_CENTAVOS ||
                    descuentosCentavos > MAXIMO_CENTAVOS
                ) {
                    errores.push({
                        fila: null,
                        campo: "importe",
                        motivo: "Los totales superan el límite permitido"
                    });
                }

                return res.status(200).json({
                    ok: true,
                    valido: errores.length === 0,
                    cantidad: filas.length,
                    filas: errores.length ? [] : registros,
                    total_ingresos:
                        (ingresosCentavos / 100).toFixed(2),
                    total_descuentos:
                        (descuentosCentavos / 100).toFixed(2),
                    errores
                });
            } catch (error) {
                console.error(
                    "Error al validar importación CSV:",
                    error
                );

                return res.status(500).json({
                    ok: false,
                    valido: false,
                    mensaje: "Error al validar la importación"
                });
            }
        }
    );

    return router;
}

module.exports = crearRutasImportacion;
