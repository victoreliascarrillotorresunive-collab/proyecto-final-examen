"use strict";
/* Interfaz común: barra lateral, cabecera de usuario, avisos y diálogos. */
const Ui = (() => {
    function el(etiqueta, atributos = {}, ...hijos) {
        const nodo = document.createElement(etiqueta);
        for (const [k, v] of Object.entries(atributos)) {
            if (v === false || v === null || v === undefined) continue;
            if (k === "class") nodo.className = v;
            else if (k === "texto") nodo.textContent = v;
            else if (k.startsWith("on")) nodo.addEventListener(k.slice(2), v);
            else nodo.setAttribute(k, v === true ? "" : v);
        }
        hijos.flat().forEach(h => { if (h !== null && h !== undefined && h !== false) nodo.append(h); });
        return nodo;
    }

    function llenarSelect(select, opciones, valor) {
        select.innerHTML = "";
        opciones.forEach(o => select.appendChild(el("option", { value: o.valor, texto: o.texto })));
        if (valor !== undefined && opciones.some(o => o.valor === valor)) select.value = valor;
    }

    function iconos() { if (window.lucide) window.lucide.createIcons(); }

    function aviso(texto, tipo = "ok") {
        let zona = document.getElementById("zonaAvisos");
        if (!zona) { zona = el("div", { id: "zonaAvisos", "aria-live": "polite" }); document.body.appendChild(zona); }
        const nodo = el("div", { class: `aviso-flotante ${tipo}`, role: "status", texto });
        zona.appendChild(nodo);
        setTimeout(() => nodo.remove(), 4500);
    }

    /* Diálogo modal. acciones: [{texto, tipo: "primario"|"secundario"|"peligro", valor, validar?}]
       Devuelve una promesa con el `valor` de la acción elegida (null si se cierra con Esc). */
    function modal({ titulo, cuerpo, acciones }) {
        return new Promise(resolver => {
            const error = el("p", { class: "modal-error", role: "alert" });
            const dialogo = el("dialog", { class: "modal" },
                el("h2", { texto: titulo }),
                el("div", { class: "modal-cuerpo" }, cuerpo),
                error,
                el("div", { class: "modal-acciones" }, acciones.map(a => el("button", {
                    type: "button", class: `btn ${a.tipo || "secundario"}`, texto: a.texto,
                    onclick: () => {
                        if (a.validar) {
                            const r = a.validar();
                            if (r !== true) { error.textContent = r; return; }
                        }
                        dialogo.close(); resolver(a.valor);
                    }
                })))
            );
            dialogo.addEventListener("cancel", () => resolver(null));
            dialogo.addEventListener("close", () => dialogo.remove());
            document.body.appendChild(dialogo);
            dialogo.showModal();
        });
    }

    function formatoFecha(iso) {
        const [a, m, d] = iso.split("-").map(Number);
        return new Date(a, m - 1, d).toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" });
    }
    function formatoFechaHora(ms) {
        return new Date(ms).toLocaleString("es-SV", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }

    return { el, llenarSelect, iconos, aviso, modal, formatoFecha, formatoFechaHora };
})();

const Portal = (() => {
    const NAVEGACION = [
        { id: "inicio", href: "dashboard.html", icono: "house", texto: "Inicio" },
        { id: "grupos", href: "grupos.html", icono: "book-open", texto: "Mis grupos" },
        { id: "calificaciones", href: "calificaciones.html", icono: "clipboard-check", texto: "Calificaciones" },
        { id: "evaluaciones", href: "evaluaciones.html", icono: "file-text", texto: "Evaluaciones" },
        { id: "actas", href: "actas.html", icono: "file-spreadsheet", texto: "Actas y registros" },
        { id: "calendario", href: "calendario.html", icono: "calendar", texto: "Calendario" },
        { id: "manual", href: "manual.html", icono: "help-circle", texto: "Ayuda" }
    ];

    function nombreVisible() {
        const ajustado = Datos.ajustes().nombre.trim();
        if (ajustado) return ajustado;
        const u = (Sesion.actual() || {}).usuario || "Docente";
        return u.charAt(0).toUpperCase() + u.slice(1);
    }
    function iniciales(nombre) {
        const partes = nombre.split(/\s+/).filter(Boolean);
        return ((partes[0] || "D")[0] + (partes.length > 1 ? partes[partes.length - 1][0] : (partes[0][1] || ""))).toUpperCase();
    }
    function etiquetaPeriodo() {
        const c = Datos.cicloActual();
        return `${c.nombre} · Periodo ${Datos.periodoActual()}`;
    }

    function dibujarBarraLateral() {
        const barra = document.getElementById("sidebar");
        if (!barra) return;
        const pagina = document.body.dataset.pagina;
        const enlace = (n, extra = {}) => Ui.el("a", { href: n.href, class: n.id === pagina ? "menu-activo" : false, "aria-current": n.id === pagina ? "page" : false, ...extra },
            Ui.el("i", { "data-lucide": n.icono }), n.texto);
        barra.append(
            Ui.el("div", { class: "sidebar-logo" }, Ui.el("img", { src: "img/images.png", alt: "Logo" })),
            Ui.el("div", { class: "docente" }, Ui.el("strong", { texto: "Portal Docente" }), Ui.el("span", { texto: Datos.cicloActual().nombre })),
            Ui.el("nav", { class: "menu" }, NAVEGACION.map(n => enlace(n))),
            Ui.el("div", { class: "menu-inferior" },
                enlace({ id: "configuracion", href: "configuracion.html", icono: "settings", texto: "Configuración" }),
                Ui.el("a", { href: "index.html", id: "cerrarSesion" }, Ui.el("i", { "data-lucide": "log-out" }), "Cerrar sesión"))
        );
        document.getElementById("cerrarSesion").addEventListener("click", ev => {
            ev.preventDefault();
            Sesion.cerrar();
            window.location.replace("index.html?sesion=cerrada");
        });
    }

    function dibujarUsuario() {
        const nombre = nombreVisible();
        const caja = document.getElementById("usuarioHeader");
        if (caja) caja.append(Ui.el("div", { class: "avatar", texto: iniciales(nombre) }),
            Ui.el("div", {}, Ui.el("strong", { id: "nombreUsuario", texto: nombre }), Ui.el("span", { texto: "Profesor" })));
        document.querySelectorAll("[data-periodo-actual]").forEach(n => { n.textContent = etiquetaPeriodo().toUpperCase(); });
        document.querySelectorAll("[data-nombre-usuario]").forEach(n => { n.textContent = nombre; });
    }

    function iniciar() {
        dibujarBarraLateral();
        dibujarUsuario();
        Ui.iconos();
    }

    // Parámetros de la URL validados contra los datos (grupo, ciclo, periodo)
    function contextoInicial() {
        const q = new URLSearchParams(window.location.search);
        const g = Datos.grupo(q.get("grupo")) ? q.get("grupo") : Datos.grupos()[0].id;
        const c = Datos.ciclo(q.get("ciclo")) ? q.get("ciclo") : Datos.cicloActual().id;
        const p = ["1", "2", "3"].includes(q.get("periodo")) ? q.get("periodo") : String(Datos.periodoActual());
        return { grupo: g, ciclo: c, periodo: p, evaluacion: q.get("evaluacion") };
    }

    return { iniciar, nombreVisible, contextoInicial, etiquetaPeriodo };
})();

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", Portal.iniciar);
else Portal.iniciar();