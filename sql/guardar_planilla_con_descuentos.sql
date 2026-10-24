CREATE OR REPLACE FUNCTION public.guardar_planilla_con_descuentos(
    p_registro jsonb,
    p_descuentos jsonb
)
RETURNS TABLE (
    id uuid,
    fecha_guardado timestamptz,
    total_pagar numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_planilla_id uuid;
    v_fecha timestamptz;
    v_salario numeric;
    v_ingresos numeric;
    -- HU-19: datos para validar el cálculo proporcional.
    v_salario_base_mensual numeric;
    v_dias_remunerados integer;
    v_salario_proporcional numeric;
    v_total_descuentos numeric := 0;
    v_total_pagar numeric;
    v_descuento jsonb;
    v_concepto text;
    v_importe numeric;
    -- HU-13: cantidades de horas trabajadas.
    v_horas_ordinarias numeric;
    v_horas_extras numeric;

    -- HU-19: identificar las planillas calculadas por días.
    v_es_planilla_por_dias boolean;
BEGIN
    v_es_planilla_por_dias :=
        (p_registro->>'modo_calculo') = 'dias';
    -- HU-19: rechazar modalidades de cálculo desconocidas.
    IF COALESCE(p_registro->>'modo_calculo', 'horas')
        NOT IN ('dias', 'horas')
    THEN
        RAISE EXCEPTION 'Modo de calculo invalido';
    END IF;
    -- Exigir un resultado calculado por la nueva API.
    IF coalesce(p_registro->>'periodo_pago', '') NOT IN ('mensual', 'quincenal', 'semanal')
       OR jsonb_typeof(p_registro->'deducciones_legales') IS DISTINCT FROM 'object'
       OR coalesce(p_registro->'deducciones_legales'->>'version', '') = '' THEN
        RAISE EXCEPTION 'Falta la frecuencia o la versión de las deducciones legales';
    END IF;
    -- Comprobar que se recibió una lista.
    IF p_descuentos IS NULL
       OR jsonb_typeof(p_descuentos) <> 'array' THEN
        RAISE EXCEPTION 'Debe enviar una lista de descuentos';
    END IF;

    -- Validar cada descuento y sumar sus importes.
    FOR v_descuento IN
        SELECT value
        FROM jsonb_array_elements(p_descuentos)
    LOOP
        IF jsonb_typeof(v_descuento) <> 'object' THEN
            RAISE EXCEPTION 'Descuento inválido';
        END IF;

        v_concepto := trim(v_descuento->>'concepto');

        IF v_concepto IS NULL OR v_concepto = '' THEN
            RAISE EXCEPTION 'El concepto es obligatorio';
        END IF;

        IF (v_descuento->>'importe') IS NULL
           OR (v_descuento->>'importe')
              !~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
            RAISE EXCEPTION 'Importe de descuento inválido';
        END IF;

        v_importe := (v_descuento->>'importe')::numeric;

        IF v_importe <= 0 OR v_importe > 9999999999.99 THEN
            RAISE EXCEPTION 'Importe de descuento fuera de rango';
        END IF;

        v_total_descuentos := v_total_descuentos + v_importe;
    END LOOP;

    -- Recalcular los totales en la base de datos.
    v_salario := (p_registro->>'salario_base')::numeric;
    v_ingresos := (p_registro->>'ingresos_adicionales')::numeric;

    -- HU-19: validar el salario proporcional de las planillas por días.
IF v_es_planilla_por_dias THEN

    IF p_registro->>'periodo_pago' IS DISTINCT FROM 'mensual' THEN
        RAISE EXCEPTION
            'El calculo proporcional por dias requiere una planilla mensual';
    END IF;

    IF COALESCE(p_registro->>'salario_base_mensual', '')
        !~ '^[0-9]+(\.[0-9]{1,2})?$'
        OR COALESCE(p_registro->>'dias_remunerados', '')
        !~ '^[0-9]+$'
        OR COALESCE(p_registro->>'salario_proporcional', '')
        !~ '^[0-9]+(\.[0-9]{1,2})?$'
    THEN
        RAISE EXCEPTION 'Datos del salario proporcional invalidos';
    END IF;

    v_salario_base_mensual :=
        (p_registro->>'salario_base_mensual')::numeric;

    v_dias_remunerados :=
        (p_registro->>'dias_remunerados')::integer;

    v_salario_proporcional :=
        (p_registro->>'salario_proporcional')::numeric;

    IF v_salario_base_mensual > 9999999999.99
        OR v_dias_remunerados NOT BETWEEN 0 AND 30
        OR v_salario_proporcional > 9999999999.99
    THEN
        RAISE EXCEPTION 'Valores del salario proporcional fuera de rango';
    END IF;

    IF v_salario_proporcional <>
        ROUND(v_salario_base_mensual * v_dias_remunerados / 30, 2)
        OR v_salario IS DISTINCT FROM v_salario_proporcional
    THEN
        RAISE EXCEPTION 'El salario proporcional no coincide con el calculo';
    END IF;

END IF;

    IF v_salario IS NULL OR v_ingresos IS NULL
       OR v_salario < 0 OR v_ingresos < 0 THEN
        RAISE EXCEPTION 'Ingresos inválidos';
    END IF;

    IF v_total_descuentos > v_salario + v_ingresos THEN
        RAISE EXCEPTION 'Los descuentos no pueden superar los ingresos';
    END IF;

    v_total_pagar := v_salario + v_ingresos - v_total_descuentos;

-- HU-13 y HU-19: validar horas solo en planillas anteriores.
IF v_es_planilla_por_dias THEN
    v_horas_ordinarias := NULL;
    v_horas_extras := NULL;
ELSE
    IF (p_registro->>'horas_ordinarias') IS NULL
        OR (p_registro->>'horas_ordinarias') !~ '^[0-9]+(\.[0-9]{1,2})?$'
        OR (p_registro->>'horas_extras') IS NULL
        OR (p_registro->>'horas_extras') !~ '^[0-9]+(\.[0-9]{1,2})?$' THEN
        RAISE EXCEPTION 'Las horas deben ser números mayores o iguales a cero, con máximo dos decimales';
    END IF;

    v_horas_ordinarias := (p_registro->>'horas_ordinarias')::numeric;
    v_horas_extras := (p_registro->>'horas_extras')::numeric;

    IF v_horas_ordinarias > 99999999.99
        OR v_horas_extras > 99999999.99 THEN
        RAISE EXCEPTION 'Las horas no pueden superar 99999999.99';
    END IF;
END IF;

    -- Guardar la planilla.
    INSERT INTO public.planillas (
        plantilla_id,
        empleado_id,
        mes,
        anio,
        plantilla_nombre,
        empleado_codigo,
        empleado_nombre,
        empleado_dui,
        empleado_cargo,
        salario_original,
        motivo_ajuste,
        salario_base,
        salario_base_mensual,
        salario_proporcional,
        dias_remunerados,
        ingresos_adicionales,
        horas_ordinarias,
        horas_extras,
        descuentos_totales,
        total_pagar
    )
    VALUES (
        (p_registro->>'plantilla_id')::uuid,
        (p_registro->>'empleado_id')::uuid,
        (p_registro->>'mes')::integer,
        (p_registro->>'anio')::integer,
        p_registro->>'plantilla_nombre',
        p_registro->>'empleado_codigo',
        p_registro->>'empleado_nombre',
        p_registro->>'empleado_dui',
        p_registro->>'empleado_cargo',
        (p_registro->>'salario_original')::numeric,
        p_registro->>'motivo_ajuste',
        v_salario,
        v_salario_base_mensual,
        v_salario_proporcional,
        v_dias_remunerados,
        v_ingresos,
        v_horas_ordinarias,
        v_horas_extras,
        v_total_descuentos,
        v_total_pagar
    )
    RETURNING
        planillas.id,
        planillas.fecha_guardado
    INTO v_planilla_id, v_fecha;

    -- Guardar los descuentos vinculados a esa planilla.
    FOR v_descuento IN
        SELECT value
        FROM jsonb_array_elements(p_descuentos)
    LOOP
        INSERT INTO public.planilla_descuentos (
            planilla_id,
            concepto,
            importe
        )
        VALUES (
            v_planilla_id,
            trim(v_descuento->>'concepto'),
            (v_descuento->>'importe')::numeric
        );
    END LOOP;

    -- Devolver el resultado del guardado.
    RETURN QUERY
    SELECT v_planilla_id, v_fecha, v_total_pagar;
END;
$$;