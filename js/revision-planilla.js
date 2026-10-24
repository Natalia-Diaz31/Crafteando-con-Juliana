import {
    obtenerEstadoNovedades,
    validarNovedadesFormulario
} from "./novedades.js";

import {
    obtenerIngresos,
    validarIngresosPendientes
} from "./ingresos-detalle.js";

import {
    obtenerAjusteSalario,
    validarAjusteFormulario
} from "./salario-ajuste.js";

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

    function ocultarResumen() {
        resumen.hidden = true;
        const casilla = document.getElementById("confirmacion-revisado");
        if (casilla) casilla.checked = false;
        document.getElementById("btn-guardar-planilla").disabled = true;
        boton.setAttribute("aria-expanded", "false");
    }

    function mostrarDato(id, valor) {
        document.getElementById(id).textContent = valor;
    }

    // Convierte montos validados a centavos para calcular.
    function aCentavos(valor) {
        const [entero, decimales = ""] = valor.trim().split(".");
        return Number(entero) * 100 +
            Number(decimales.padEnd(2, "0"));
    }

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();
        ocultarResumen();
        if (
    !validarNovedadesFormulario() ||
    !validarIngresosPendientes() ||
    !validarAjusteFormulario()
    ) {
    return;
    }

        const legalesValidos = window.validarDeduccionesLegales();
        window.actualizarDescuentosTotales();
        const horasValidas = window.validarHorasPlanilla();
        const empleadoValido = window.actualizarBloqueoEmpleado();
        const obligatoriosValidos =
            window.validarObligatoriosPlanilla();
        const montosValidos = window.validarMontosPlanilla();
        const detalleValido = window.validarDetalleDescuentos();

        if (
            !empleadoValido ||
            !obligatoriosValidos ||
            !montosValidos ||
            !detalleValido || !legalesValidos || !horasValidas
        ) {
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

        const salario = aCentavos(
            document.getElementById("salario").value
        );
        const ingresos = aCentavos(
            document.getElementById("ingresos").value
        );
        const descuentos = aCentavos(
            document.getElementById("descuentos").value
        );

        if (descuentos > salario + ingresos) {
            const campo = document.getElementById("descuentos");
            const error = document.getElementById("descuentos-error");

            campo.classList.add("is-invalid");
            campo.setAttribute("aria-invalid", "true");
            error.textContent =
                "Los descuentos no pueden superar los ingresos";
            error.classList.add("d-block");
            campo.focus();
            return;
        }

        const empleado = window.obtenerEmpleadoSeleccionado();
        const totalIngresos = salario + ingresos;
        const total = totalIngresos - descuentos;

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
            window.obtenerDeduccionesLegales()
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