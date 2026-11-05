// ARCHIVO: Ruta de inicio de sesión
// Buscar: login, auth, HU-02

"use strict";

const express = require("express");
const jwt = require("jsonwebtoken");

// HU-02: inicio de sesión. server.js entrega Supabase y las variables de entorno.
// Qué hace: Crea el router de autenticación
// Buscar: crearRutasAuth
function crearRutasAuth({ supabase, env }) {
    const router = express.Router();

    // Qué hace: Valida correo y contraseña con Supabase y devuelve el token y el rol
    // Buscar: login, token, verificar_login, rol
    router.post("/login", async (req, res) => {
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
                    correo: usuario.correo,
                    rol: usuario.rol
                },
                env.JWT_SECRET,
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
                    correo: usuario.correo,
                    rol: usuario.rol
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

    return router;
}

module.exports = crearRutasAuth;
