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
    v_total_descuentos numeric := 0;
    v_total_pagar numeric;
    v_descuento jsonb;
    v_concepto text;
    v_importe numeric;
    -- HU-13: cantidades de horas trabajadas.
    v_horas_ordinarias numeric;
    v_horas_extras numeric;
BEGIN
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

    IF v_salario IS NULL OR v_ingresos IS NULL
       OR v_salario < 0 OR v_ingresos < 0 THEN
        RAISE EXCEPTION 'Ingresos inválidos';
    END IF;

    IF v_total_descuentos > v_salario + v_ingresos THEN
        RAISE EXCEPTION 'Los descuentos no pueden superar los ingresos';
    END IF;

    v_total_pagar := v_salario + v_ingresos - v_total_descuentos;

    -- HU-13: validar las horas trabajadas.
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
        salario_base,
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
        v_salario,
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