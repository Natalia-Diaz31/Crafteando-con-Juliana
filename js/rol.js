//
// HU-09: ROL DE LA CUENTA AUTENTICADA
//

// Acuerdo del equipo: el login devuelve usuario.rol con este valor exacto
// y el frontend lo guarda en sessionStorage con la clave "rol".
const ROL_ENCARGADO_NOMINA = "Encargado de nómina";
const CLAVE_ROL = "rol";

// Rol guardado al iniciar sesión (null si la cuenta no tiene rol)
function obtenerRol() {
    return sessionStorage.getItem(CLAVE_ROL);
}

// Para el menú y las páginas protegidas: ¿la cuenta puede crear y consultar planillas?
// Solo sirve para mostrar u ocultar opciones; la API vuelve a comprobar el rol.
function esEncargadoNomina() {
    return obtenerRol() === ROL_ENCARGADO_NOMINA;
}
