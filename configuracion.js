"use strict";
(function () {
    const $ = id => document.getElementById(id);
    const usuario = () => (Sesion.actual() || {}).usuario || "docente";

    /* ---- Preferencias ---- */
    const a = Datos.ajustes();
    Ui.llenarSelect($("ajusteCiclo"), [{ valor: "auto", texto: "Automático (según la fecha de hoy)" }, ...Datos.ciclos().map(c => ({ valor: c.id, texto: c.nombre }))], a.cicloPredeterminado);
    $("ajusteNombre").value = a.nombre;
    $("ajusteNota").value = a.notaMinima;

    $("formAjustes").addEventListener("submit", ev => {
        ev.preventDefault();
        const nota = Number($("ajusteNota").value);
        if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
            $("mensajeAjustes").style.color = "#c62828";
            $("mensajeAjustes").textContent = "La nota mínima debe estar entre 0 y 10.";
            return;
        }
        Datos.guardarAjustes({ nombre: $("ajusteNombre").value.trim(), cicloPredeterminado: $("ajusteCiclo").value, notaMinima: nota });
        window.location.href = "configuracion.html?guardado=1"; // recarga para refrescar nombre y ciclo en toda la interfaz
    });
    if (new URLSearchParams(window.location.search).get("guardado")) Ui.aviso("Preferencias guardadas.");

    /* ---- Traslados a Registro ---- */
    function dibujarTraslados() {
        const caja = $("tablaTraslados");
        caja.innerHTML = "";
        const filas = [];
        Datos.grupos().forEach(g => Datos.ciclos().forEach(c => [1, 2, 3].forEach(p => {
            const r = Notas.registro(g.id, c.id, String(p));
            if (r.estado === "trasladado") filas.push({ g, c, p, r });
        })));
        if (!filas.length) { caja.appendChild(Ui.el("p", { class: "vacio", texto: "Ningún periodo ha sido trasladado a Registro." })); return; }
        caja.appendChild(Ui.el("table", { class: "tabla-simple" },
            Ui.el("thead", {}, Ui.el("tr", {}, ["Grupo", "Ciclo", "Periodo", "Folio", "Fecha", "Reapertura", ""].map(t => Ui.el("th", { texto: t })))),
            Ui.el("tbody", {}, filas.map(({ g, c, p, r }) => Ui.el("tr", {},
                Ui.el("td", { texto: `${g.codigo} · S${g.seccion}` }),
                Ui.el("td", { texto: c.nombre }),
                Ui.el("td", { texto: String(p) }),
                Ui.el("td", { texto: r.folio }),
                Ui.el("td", { texto: Ui.formatoFechaHora(r.fecha) }),
                Ui.el("td", { texto: r.reapertura ? "Solicitada" : "—" }),
                Ui.el("td", {}, Ui.el("button", {
                    type: "button", class: "btn secundario", title: "Solo demostración: en producción lo hace Registro Académico",
                    onclick: async () => {
                        const ok = await Ui.modal({
                            titulo: "Reabrir periodo (demostración)",
                            cuerpo: Ui.el("p", { texto: `Se desbloqueará el Periodo ${p} de ${g.codigo} · S${g.seccion} (${c.nombre}). En un sistema real esta acción la realizaría Registro Académico.` }),
                            acciones: [{ texto: "Cancelar", valor: false }, { texto: "Reabrir", tipo: "primario", valor: true }]
                        });
                        if (!ok) return;
                        Notas.reabrir(g.id, c.id, String(p));
                        Ui.aviso("Periodo reabierto.", "info");
                        dibujarTraslados();
                    }
                }, "Reabrir (demo)")))))));
    }
    dibujarTraslados();

    /* ---- Datos de ejemplo ---- */
    function semilla(texto) { let h = 7; for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
    function aleatorio(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

    async function cargarEjemplo() {
        const ok = await Ui.modal({
            titulo: "Cargar notas de ejemplo",
            cuerpo: [Ui.el("p", { texto: "Se generarán notas para los periodos 1 y 2 del Ciclo II - 2026 en todos los grupos y se trasladarán a Registro." }),
                Ui.el("p", { texto: "Reemplaza las notas de esos periodos si ya existían (los periodos ya trasladados se respetan)." })],
            acciones: [{ texto: "Cancelar", valor: false }, { texto: "Cargar", tipo: "primario", valor: true }]
        });
        if (!ok) return;
        const c = "ciclo2-2026";
        let creados = 0;
        Datos.grupos().forEach(g => [1, 2].forEach(p => {
            const P = String(p);
            if (Notas.bloqueado(g.id, c, P)) return;
            const evals = Notas.evaluaciones(g.id, c, P);
            const notas = {}, delCiclo = Notas.notasCiclo(g.id, c);
            Datos.estudiantes(g.id).forEach(est => {
                const azar = aleatorio(semilla(`${est.id}-${p}`));
                const nivel = 5.2 + azar() * 4.4; // rendimiento base del estudiante: 5.2 a 9.6
                notas[est.id] = {};
                evals.forEach(e => { notas[est.id][e.id] = Math.round(Math.min(10, Math.max(0, nivel + (azar() - 0.5) * 1.8)) * 10) / 10; });
                delCiclo[est.id] = { ...(delCiclo[est.id] || {}), [`p${p}`]: Notas.redondear(Notas.notaPeriodo(evals, notas[est.id])) };
            });
            Notas.guardarNotas(g.id, c, P, notas);
            Notas.guardarNotasCiclo(g.id, c, delCiclo);
            if (Notas.trasladar(g.id, c, P, usuario()).ok) creados++;
        }));
        Ui.aviso(`Notas de ejemplo cargadas: ${creados} periodos trasladados a Registro.`);
        dibujarTraslados();
    }
    $("cargarEjemplo").addEventListener("click", cargarEjemplo);

    $("borrarDatos").addEventListener("click", async () => {
        const ok = await Ui.modal({
            titulo: "Borrar todos los datos",
            cuerpo: Ui.el("p", { texto: "Se eliminarán las evaluaciones, notas, traslados a Registro y preferencias guardadas en este navegador. Tu sesión se mantiene. Esta acción no se puede deshacer." }),
            acciones: [{ texto: "Cancelar", valor: false }, { texto: "Borrar todo", tipo: "peligro", valor: true }]
        });
        if (!ok) return;
        Object.keys(localStorage).filter(k => k.startsWith("portal_")).forEach(k => localStorage.removeItem(k));
        window.location.href = "configuracion.html";
    });
})();
