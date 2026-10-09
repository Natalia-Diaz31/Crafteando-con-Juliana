document.addEventListener("DOMContentLoaded", () => {
    const salario = document.getElementById("salario");
    const ingresos = document.getElementById("ingresos");
    const descuentos = document.getElementById("descuentos");
    const total = document.getElementById("total-calculado");

    // Solo se calculan montos válidos, con máximo dos decimales.
    const formatoMonetario = /^\d+(?:\.\d{1,2})?$/;

    function convertirACentavos(valor) {
        const [entero, decimales = ""] = valor.split(".");

        return Number(entero) * 100 +
            Number(decimales.padEnd(2, "0"));
    }

    function actualizarTotal() {
        const valores = [
            salario.value.trim(),
            ingresos.value.trim(),
            descuentos.value.trim()
        ];

        // No calcular con campos vacíos o montos inválidos.
        if (valores.some(valor => !formatoMonetario.test(valor))) {
            total.textContent = "—";
            return;
        }

        const salarioCentavos = convertirACentavos(valores[0]);
        const ingresosCentavos = convertirACentavos(valores[1]);
        const descuentosCentavos = convertirACentavos(valores[2]);

        // No mostrar un total válido si los descuentos son excesivos.
        if (descuentosCentavos > salarioCentavos + ingresosCentavos) {
            total.textContent = "—";
            return;
        }

        const resultado =
            salarioCentavos + ingresosCentavos - descuentosCentavos;

        total.textContent = (resultado / 100).toFixed(2);
    }

    [salario, ingresos, descuentos].forEach(campo => {
        campo.addEventListener("input", actualizarTotal);
    });

    actualizarTotal();
});