-- HU-25: Índice para consultar el historial
-- de planillas por empleado y período.

CREATE INDEX IF NOT EXISTS
    idx_planillas_empleado_periodo_guardado
ON public.planillas (
    empleado_id,
    anio DESC,
    mes DESC,
    fecha_guardado DESC,
    id DESC
);
