
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();


app.use(cors({
    origin: [
        "https://sistemadeplanillas.vercel.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ]
}));

app.use(express.json());

// Conexión con nuestra base de datos
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

// Comprobar que funciona la API
app.get("/health", (req, res) => {
    res.json({
        ok: true,
        mensaje: "API funcionando"
    });
});

//
// HU-02: INICIO DE SESIÓN
//

app.post("/api/auth/login", async (req, res) => {
    try {
        // 1. Recibir correo y contraseña
        const { correo, contrasena } = req.body || {};

        // 2. Comprobar que ambos campos estén llenos
        if (
            typeof correo !== "string" ||
            typeof contrasena !== "string" ||
            !correo.trim() ||
            !contrasena
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe ingresar correo y contraseña"
            });
        }

        // 3. Consultar Supabase
        const { data, error } = await supabase.rpc(
            "verificar_login",
            {
                p_correo: correo.trim(),
                p_contrasena: contrasena
            }
        );

        // 4. Comprobar errores de base de datos
        if (error) {
            console.error("Error en login:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "Error al verificar las credenciales"
            });
        }

        // 5. Verificar si la cuenta existe
        const usuario = data?.[0];

        if (!usuario) {
            return res.status(401).json({
                ok: false,
                mensaje: "Correo o contraseña incorrectos"
            });
        }

        // 6. Crear token de sesión
        const token = jwt.sign(
            {
                id: usuario.id,
                correo: usuario.correo
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        // 7. Responder al frontend
        return res.status(200).json({
            ok: true,
            mensaje: "Inicio de sesión exitoso",
            token: token,
            usuario: {
                id: usuario.id,
                correo: usuario.correo
            }
        });

    } catch (error) {
        console.error("Error del servidor:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor"
        });
    }
});


//
// HU-03: CONSULTAR PLANTILLA
//

app.get("/api/plantillas", verificarToken, async (req, res) => {
    try {
        // 1. Buscar nuestra plantilla en Supabase
        const { data: plantilla, error: errorPlantilla } =
            await supabase
                .from("plantillas")
                .select("id, nombre, descripcion")
                .eq("nombre", "Planilla básica mensual")
                .single();

        if (errorPlantilla || !plantilla) {
            console.error("Error plantilla:", errorPlantilla);

            return res.status(404).json({
                ok: false,
                mensaje: "No se encontró la plantilla"
            });
        }

        // 2. Buscar los campos de esa plantilla
        const { data: campos, error: errorCampos } =
            await supabase
                .from("campos_plantilla")
                .select("nombre, orden")
                .eq("plantilla_id", plantilla.id)
                .order("orden", { ascending: true });

        if (errorCampos) {
            console.error("Error campos:", errorCampos);

            return res.status(500).json({
                ok: false,
                mensaje: "No se pudieron consultar los campos"
            });
        }

        // 3. Devolver la información al frontend
        return res.status(200).json({
            ok: true,
            plantilla: {
                id: plantilla.id,
                nombre: plantilla.nombre,
                descripcion: plantilla.descripcion,
                campos: campos
            }
        });

    } catch (error) {
        console.error("Error del servidor:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error interno del servidor"
        });
    }
});


//
// HU-04: BUSCAR EMPLEADOS
//

// Verificar que el usuario haya iniciado sesión
function verificarToken(req, res, next) {
    const autorizacion = req.headers.authorization || "";
    const partes = autorizacion.split(" ");

    if (partes.length !== 2 || partes[0] !== "Bearer") {
        return res.status(401).json({
            ok: false,
            mensaje: "Debe iniciar sesión"
        });
    }

    try {
        req.usuario = jwt.verify(
            partes[1],
            process.env.JWT_SECRET
        );

        next();
    } catch (error) {
        return res.status(401).json({
            ok: false,
            mensaje: "Sesión inválida o expirada"
        });
    }
}


// Endpoint para buscar empleados
app.get("/api/empleados/buscar", verificarToken, async (req, res) => {
    try {
        // 1. Obtener el término de búsqueda
        const termino = String(req.query.q || "").trim();

        if (!termino) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe ingresar un dato para buscar"
            });
        }

        if (termino.length > 100) {
            return res.status(400).json({
                ok: false,
                mensaje: "La búsqueda es demasiado larga"
            });
        }

        const columnas =
            "id, codigo, nombre_completo, dui, cargo";

        // 2. Buscar primero por código exacto
        const { data: porCodigo, error: errorCodigo } =
            await supabase
                .from("empleados")
                .select(columnas)
                .eq("codigo", termino);

        if (errorCodigo) throw errorCodigo;

        if (porCodigo.length > 0) {
            return res.json({
                ok: true,
                empleados: porCodigo
            });
        }

        // 3. Buscar por DUI exacto
        const { data: porDui, error: errorDui } =
            await supabase
                .from("empleados")
                .select(columnas)
                .eq("dui", termino);

        if (errorDui) throw errorDui;

        if (porDui.length > 0) {
            return res.json({
                ok: true,
                empleados: porDui
            });
        }

        // 4. Buscar por nombre parcial
        // Escapar caracteres especiales de ILIKE
        const nombreSeguro = termino.replace(
            /[%_\\]/g,
            "\\$&"
        );

        const { data: porNombre, error: errorNombre } =
            await supabase
                .from("empleados")
                .select(columnas)
                .ilike("nombre_completo", `%${nombreSeguro}%`);

        if (errorNombre) throw errorNombre;

        // 5. Devolver los resultados
        return res.status(200).json({
            ok: true,
            empleados: porNombre || []
        });

    } catch (error) {
        console.error("Error al buscar empleados:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al buscar empleados"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});

const jwt = require("jsonwebtoken");
