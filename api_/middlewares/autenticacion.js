// ARCHIVO: Middlewares de sesión (token) y de rol de nómina
// Buscar: autenticación, token, rol, permisos

"use strict";

const jwt = require("jsonwebtoken");

// Sesión y permisos de las rutas protegidas. server.js entrega el cliente
// de Supabase y las variables de entorno (las pruebas los sustituyen ahí).
// Qué hace: Crea los middlewares con Supabase y el entorno que entrega server.js
// Buscar: crearMiddlewaresAutenticacion
function crearMiddlewaresAutenticacion({ supabase, env }) {
    // Verificar que el usuario haya iniciado sesión
    // Qué hace: Revisa el token JWT; responde 401 si falta o venció
    // Buscar: verificarToken, jwt, 401, sesión
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
                env.JWT_SECRET
            );

            next();
        } catch (error) {
            return res.status(401).json({
                ok: false,
                mensaje: "Sesión inválida o expirada"
            });
        }
    }

    // HU-09: Verificar permisos del encargado de nómina
    // Qué hace: Consulta el rol de la cuenta; responde 403 si no es encargado de nómina
    // Buscar: verificarRolNomina, rol, 403, HU-09
    async function verificarRolNomina(req, res, next) {
        try {
            // Obtener el ID de la cuenta autenticada
            const idUsuario = req.usuario?.id;

            if (!idUsuario) {
                return res.status(401).json({
                    ok: false,
                    mensaje: "Debe iniciar sesión"
                });
            }

            // Consultar el rol real en Supabase
            const { data, error } = await supabase
                .from("cuentas")
                .select("rol")
                .eq("id", idUsuario)
                .maybeSingle();

            if (error) {
                console.error("Error al consultar el rol:", error);

                return res.status(500).json({
                    ok: false,
                    mensaje: "Error al verificar los permisos"
                });
            }

            // Comprobar que la cuenta tenga el rol requerido
            if (!data || data.rol !== "Encargado de nómina") {
                return res.status(403).json({
                    ok: false,
                    mensaje: "No tiene permisos para acceder a esta función"
                });
            }

            // Permitir continuar con la operación
            next();

        } catch (error) {
            console.error("Error de autorización:", error);

            return res.status(500).json({
                ok: false,
                mensaje: "Error interno del servidor"
            });
        }
    }

    return { verificarToken, verificarRolNomina };
}

module.exports = crearMiddlewaresAutenticacion;
