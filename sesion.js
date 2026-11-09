"use strict";
/* Control de sesión. Se carga en el <head> (antes de pintar la página) para que
   una página protegida nunca llegue a mostrarse sin sesión válida.
   AVISO: es una protección del lado del cliente, suficiente para una demo,
   pero no sustituye la autenticación en un servidor. */
const Sesion = (() => {
    const CLAVE = "portal_sesion";
    const CLAVE_ANTIGUA = "usuario";
    const LIMITE_INACTIVIDAD_MS = 30 * 60 * 1000;

    function leerCruda() {
        try { return JSON.parse(sessionStorage.getItem(CLAVE)); } catch (e) { return null; }
    }
    function actual() {
        const s = leerCruda();
        if (!s || typeof s.usuario !== "string" || !s.usuario) return null;
        if (Date.now() - Number(s.ultima || 0) > LIMITE_INACTIVIDAD_MS) return null;
        return s;
    }
    function iniciar(usuario) {
        sessionStorage.removeItem(CLAVE_ANTIGUA);
        sessionStorage.setItem(CLAVE, JSON.stringify({ usuario, inicio: Date.now(), ultima: Date.now() }));
    }
    function cerrar() {
        sessionStorage.removeItem(CLAVE);
        sessionStorage.removeItem(CLAVE_ANTIGUA);
    }
    function irALogin(motivo) {
        cerrar();
        document.documentElement.hidden = true;
        window.location.replace(motivo ? `index.html?sesion=${motivo}` : "index.html");
    }
    function exigir() {
        if (actual()) return true;
        irALogin(leerCruda() ? "expirada" : "");
        return false;
    }

    let ultimaRenovacion = 0;
    function renovar() {
        const s = actual();
        if (!s || Date.now() - ultimaRenovacion < 15000) return;
        ultimaRenovacion = Date.now();
        s.ultima = Date.now();
        sessionStorage.setItem(CLAVE, JSON.stringify(s));
    }

    const publica = document.documentElement.hasAttribute("data-publica");
    if (publica) {
        if (actual()) window.location.replace("dashboard.html");
    } else if (exigir()) {
        ["click", "keydown", "input"].forEach(e => document.addEventListener(e, renovar, { passive: true }));
        setInterval(() => { if (!actual()) irALogin("expirada"); }, 30000);
        // Al volver con el botón "atrás" tras cerrar sesión, el navegador puede mostrar la página en caché.
        window.addEventListener("pageshow", ev => { if (ev.persisted) exigir(); });
    }

    return { actual, iniciar, cerrar, exigir };
})();
