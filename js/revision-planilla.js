import { obtenerEstadoNovedades } from "./novedades.js";
import { obtenerIngresos } from "./ingresos-detalle.js";
import { obtenerAjusteSalario } from "./salario-ajuste.js";
import { esPlanillaPorDias } from "./salario-dias.js";

// HU-35: coordinador de revisión y validaciones exportadas por cada componente.
import { validarRevision } from "./validacion-revision.js";
import { VALIDACIONES_REVISION_COMPONENTES } from "./validaciones-revision-componentes.js";
import { validarMontosPlanilla } from "./validar-montos.js";
import {
    validarDetalleDescuentos,
    obtenerSubtotalDescuentosManuales
} from "./descuentos-detalle.js";

// HU-34: totales compartidos. HU-28: comparación con la planilla anterior.
import { obtenerDeduccionesLegales } from "./deducciones-legales.js";
import { prepararEntradasTotales } from "./entradas-totales-planilla.js";
import { calcularTotales } from "./totales-planilla.js";
import { compararImportes } from "./comparacion-planillas.js";

const VALIDACIONES_REVISION = [
    ...VALIDACIONES_REVISION_COMPONENTES,
    {
        campo: "salario",
        mensaje: "Corrija los montos de la planilla",
        validar: validarMontosPlanilla
    },
    {
        campo: "descuento-concepto",
        mensaje: "Corrija el detalle de descuentos",
        validar: validarDetalleDescuentos
    }
];

const CONCEPTOS_COMPARACION = {
    totalIngresos: "Total de ingresos",
    deduccionesLegales: "Deducciones legales",
    descuentosManuales: "Descuentos manuales",
    totalPagar: "Total a pagar"
};

document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("form-planilla");
    const resumen = document.getElementById("resumen-planilla");
    const boton = document.getElementById("revisar-planilla");
    const editar = document.getElementById("editar-datos");

    const formatoUSD = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    });

    // Al abrir la página, el resumen siempre está oculto.
    resumen.hidden = true;

    // HU-18 a HU-21: bloque para novedades, salario por días, bonos y ajuste.
    // Si la página no lo trae, se crea antes de los descuentos autorizados.
    if (!document.getElementById("resumen-complementos")) {
        document.getElementById("resumen-manuales")
            .closest(".revision-section")
            .before(Object.assign(document.createElement("div"), {
                id: "resumen-complementos",
                className: "revision-section table-responsive",
                hidden: true
            }));
    }

    // HU-28: cada revisión invalida la comparación y las respuestas pendientes.
    const comparacion = document.getElementById("comparacion-planilla");
    const mensajeComparacion = document.getElementById("comparacion-mensaje");
    let versionComparacion = 0;

    function retirarComparacion() {
        versionComparacion++;
        comparacion.hidden = true;
        document.getElementById("comparacion-periodo").textContent = "";
        document.getElementById("comparacion-resultados").replaceChildren();
        mensajeComparacion.replaceChildren();
    }

    async function compararConAnterior(consulta, actuales) {
        const version = ++versionComparacion;

        comparacion.hidden = false;
        mensajeComparacion.textContent = "Consultando la planilla anterior...";

        try {
            const respuesta = await fetch(
                `${API_URL}/api/planillas/comparacion-anterior?${new URLSearchParams(consulta)}`,
                { headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` } }
            );

            window.verificarAccesoApi(respuesta);

            const resultado = await respuesta.json();

            if (version !== versionComparacion) return;

            if (!respuesta.ok || !resultado.ok) {
                throw new Error(resultado.mensaje || "No se pudo consultar la planilla anterior. Intente nuevamente");
            }

            if (!resultado.comparable) {
                mensajeComparacion.textContent = `${resultado.mensaje}: ${resultado.motivo}`;
                return;
            }

            const { anterior } = resultado;

            document.getElementById("comparacion-periodo").textContent =
                `Planilla anterior: ${anterior.periodo} · ${anterior.id}`;

            document.getElementById("comparacion-resultados").replaceChildren(
                ...compararImportes(actuales, anterior.importes, window.ReglasNomina)
                    .map((fila) => {
                        const tr = document.createElement("tr");

                        [
                            CONCEPTOS_COMPARACION[fila.campo],
                            formatoUSD.format(fila.anterior),
                            formatoUSD.format(fila.actual),
                            fila.diferencia,
                            fila.estado
                        ].forEach((texto) => tr.append(
                            Object.assign(document.createElement("td"), { textContent: texto })
                        ));

                        return tr;
                    })
            );

            mensajeComparacion.textContent = "";
        } catch (error) {
            if (version !== versionComparacion) return;

            const reintentar = Object.assign(document.createElement("button"), {
                type: "button",
                className: "btn btn-link btn-sm p-0 ms-1",
                textContent: "Reintentar"
            });

            reintentar.addEventListener("click", () => compararConAnterior(consulta, actuales));
            mensajeComparacion.replaceChildren(error.message, reintentar);
        }
    }

    function ocultarResumen() {
        resumen.hidden = true;
        const casilla = document.getElementById("confirmacion-revisado");
        if (casilla) casilla.checked = false;
        document.getElementById("btn-guardar-planilla").disabled = true;
        boton.setAttribute("aria-expanded", "false");
        retirarComparacion();
    }

    function mostrarDato(id, valor) {
        document.getElementById(id).textContent = valor;
    }

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        ocultarResumen();

        // Recalcula «Descuentos totales» antes de validar los montos.
        window.actualizarDescuentosTotales();

        // HU-35: el coordinador ejecuta todas las validaciones, sin detenerse en la primera.
        if (!validarRevision(VALIDACIONES_REVISION).valido) {
            formulario.querySelector(".is-invalid")?.focus();
            return;
        }

        const mes = document.getElementById("mes").value;
        const campoAnio = document.getElementById("anio");
        const anio = campoAnio.value.trim();

        // El año debe ser un entero positivo de cuatro cifras.
        if (!/^[1-9]\d{3}$/.test(anio)) {
            const error = document.getElementById("anio-error");

            campoAnio.classList.add("is-invalid");
            campoAnio.setAttribute("aria-invalid", "true");
            error.textContent = "Ingrese un año de cuatro cifras";
            error.classList.add("d-block");
            campoAnio.focus();
            return;
        }

        // HU-34: totales con la función compartida.
        // HU-19: en la planilla por días se usa el salario proporcional.
        const entradas = prepararEntradasTotales({
            salarioAplicable: (document.getElementById("salario-proporcional") ??
                document.getElementById("salario")).value,
            ingresosAdicionales: document.getElementById("ingresos").value,
            deduccionesLegales: obtenerDeduccionesLegales()
        }, window.ReglasNomina);

        const descuentosManuales = obtenerSubtotalDescuentosManuales();
        let totales;

        try {
            totales = calcularTotales({ ...entradas, descuentosManuales });
        } catch (error) {
            const campo = document.getElementById("descuentos");
            const mensajeError = document.getElementById("descuentos-error");

            campo.classList.add("is-invalid");
            campo.setAttribute("aria-invalid", "true");
            mensajeError.textContent = error.message;
            mensajeError.classList.add("d-block");
            campo.focus();
            return;
        }

        const salario = entradas.salario;
        const ingresos = entradas.ingresosAdicionales;
        const descuentos = totales.totalDescuentos;
        const totalIngresos = totales.totalIngresos;
        const total = totales.totalPagar;

        const empleado = window.obtenerEmpleadoSeleccionado();

        // Obtener la plantilla elegida en la HU-03.
        let plantilla = null;

        try {
            plantilla = JSON.parse(
                sessionStorage.getItem("plantillaSeleccionada")
            );
        } catch {
            plantilla = null;
        }

        if (!plantilla?.id || !plantilla?.nombre) {
            alert("Seleccione una plantilla para continuar");
            return;
        }

        mostrarDato("resumen-plantilla", plantilla.nombre);
        mostrarDato(
            "resumen-periodo",
            `${mes} ${anio} · ${document.getElementById("periodo-pago").value}`
        );

        mostrarDato(
            "resumen-empleados-incluidos",
            empleado ? 1 : 0
        );

        window.pintarDeduccionesLegales(
            document.getElementById("resumen-legales"),
            obtenerDeduccionesLegales()
        );

        // HU-12: cada concepto, su importe y la suma del detalle.
        window.pintarDescuentosAutorizados(
            document.getElementById("resumen-manuales"),
            window.obtenerDetalleDescuentos()
        );

        // HU-18, HU-20 y HU-21: cada bloque aparece solo si tiene datos
        // o si su formulario ya está integrado en la página.
        const complementos = document.getElementById("resumen-complementos");
        complementos.replaceChildren();
        complementos.hidden = true;

        const estadoNovedades = obtenerEstadoNovedades();

        if (esPlanillaPorDias()) {
            window.pintarSeccion(complementos, {
                titulo: "Salario por días remunerados",
                columnas: ["Salario base mensual", "Días remunerados", "Salario proporcional"],
                filas: [[
                    formatoUSD.format(document.getElementById("salario").value),
                    estadoNovedades.diasRemunerados,
                    formatoUSD.format(salario / 100)
                ]]
            });
        }

        if (estadoNovedades.novedades.length) {
            window.pintarSeccion(complementos, {
                titulo: "Novedades",
                columnas: ["Tipo", "Inicio", "Fin", "Condición de pago", "Días"],
                filas: estadoNovedades.novedades.map(n =>
                    [n.tipo, n.fechaInicio, n.fechaFin, n.condicion, n.dias]
                ),
                nota: `Días remunerados: ${estadoNovedades.diasRemunerados}`
            });
        }

        const ingresosDetalle = obtenerIngresos();
        if (ingresosDetalle) {
            window.pintarSeccion(complementos, {
                titulo: "Bonos e incentivos",
                columnas: ["Tipo", "Concepto", "Importe (USD)"],
                filas: ingresosDetalle.detalle.map(i =>
                    [i.tipo, i.concepto, formatoUSD.format(i.importe)]
                ),
                vacio: "Sin bonos ni incentivos",
                nota: `Total de ingresos adicionales: ${formatoUSD.format(ingresosDetalle.total)}`
            });
        }

        const ajuste = obtenerAjusteSalario(false);
        if (ajuste?.ajustado) {
            window.pintarSeccion(complementos, {
                titulo: "Salario ajustado para esta planilla",
                columnas: ["Salario registrado", "Salario utilizado", "Motivo"],
                filas: [[
                    formatoUSD.format(ajuste.salario_original),
                    formatoUSD.format(ajuste.salario_utilizado),
                    ajuste.motivo_ajuste
                ]]
            });
        }
        mostrarDato("resumen-codigo", empleado.codigo);
        mostrarDato("resumen-nombre", empleado.nombre_completo);
        mostrarDato("resumen-dui", empleado.dui);
        mostrarDato("resumen-cargo", empleado.cargo);
        mostrarDato(
            "resumen-contrato",
            empleado.tipo_contrato || "No registrado"
        );

        // HU-13: horas del mismo empleado y período.
        mostrarDato(
            "resumen-horas-ordinarias",
            window.formatoHoras(document.getElementById("horas-ordinarias").value)
        );
        mostrarDato(
            "resumen-horas-extras",
            window.formatoHoras(document.getElementById("horas-extras").value)
        );

        mostrarDato("resumen-salario", formatoUSD.format(salario / 100));
        mostrarDato("resumen-ingresos", formatoUSD.format(ingresos / 100));
        mostrarDato(
            "resumen-descuentos",
            formatoUSD.format(descuentos / 100)
        );
        mostrarDato("resumen-total", formatoUSD.format(total / 100));

        mostrarDato(
            "resumen-total-ingresos",
            formatoUSD.format(totalIngresos / 100)
        );

        // HU-29: textContent evita interpretar HTML dentro de la observación.
        mostrarDato(
            "resumen-observaciones",
            document.getElementById("observaciones").value.trim() || "Sin observaciones"
        );

        // Si el equipo agrega una casilla de confirmación,
        // debe confirmarse nuevamente en cada revisión.
        resumen.querySelectorAll('input[type="checkbox"]')
            .forEach((casilla) => {
                casilla.checked = false;
                casilla.dispatchEvent(new Event("change", {
                    bubbles: true
                }));
            });

        document.getElementById("mensaje-guardado").textContent = "";

        resumen.hidden = false;
        boton.setAttribute("aria-expanded", "true");

        // HU-28: solo las planillas mensuales se comparan con un período anterior.
        if (document.getElementById("periodo-pago").value === "mensual") {
            const motor = window.ReglasNomina;

            compararConAnterior(
                { empleado_id: empleado.id, anio, mes: motor.numeroMes(mes) },
                {
                    totalIngresos: motor.decimal(totalIngresos),
                    deduccionesLegales: motor.decimal(entradas.deduccionesLegales),
                    descuentosManuales: motor.decimal(descuentosManuales),
                    totalPagar: motor.decimal(total)
                }
            );
        }
        resumen.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    editar.addEventListener("click", () => {
        ocultarResumen();

        // Conserva lo ingresado: no ejecuta formulario.reset().
        formulario.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        document.getElementById("mes").focus();
    });

    // Evita mostrar un resumen desactualizado al cambiar datos.
    formulario.addEventListener("input", ocultarResumen);
    formulario.addEventListener("change", ocultarResumen);
    document.addEventListener("empleado:actualizado", ocultarResumen);
    document.addEventListener("planilla:modificada", ocultarResumen);

    // --- INICIO CÓDIGO DE VICTOR (HU-07) ---
  
  const checkboxConfirmacion = document.getElementById("confirmacion-revisado");
  const botonGuardar = document.getElementById("btn-guardar-planilla");

  // 1. Escuchar cuando marcan o desmarcan la casilla
  if (checkboxConfirmacion && botonGuardar) {
    checkboxConfirmacion.addEventListener("change", function() {
      // Si está checkeado (true), disabled es false (se habilita).
      botonGuardar.disabled = !this.checked; 
    });
  }

  // 2. Opcional (pero seguro): Reforzar que al presionar "Editar datos", 
  // el botón se bloquee inmediatamente por si acaso la lógica actual no lo hace a tiempo
  editar.addEventListener("click", () => {
    if (botonGuardar) {
      botonGuardar.disabled = true;
    }
  });
  
  // --- FIN CÓDIGO DE VICTOR ---

});