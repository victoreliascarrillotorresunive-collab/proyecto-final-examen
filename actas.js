"use strict";
(function () {
    const $ = id => document.getElementById(id);
    const selGrupo = $("actaGrupo"), selCiclo = $("actaCiclo"), selTipo = $("actaTipo"), selPeriodo = $("actaPeriodo");
    let datosActuales = null; // { cabecera, cuerpo, nombreArchivo }

    Ui.llenarSelect(selGrupo, Datos.grupos().map(g => ({ valor: g.id, texto: Datos.etiquetaGrupo(g) })));
    Ui.llenarSelect(selCiclo, Datos.ciclos().map(c => ({ valor: c.id, texto: c.nombre })));
    Ui.llenarSelect(selPeriodo, [1, 2, 3].map(n => ({ valor: String(n), texto: `Periodo ${n} (${Datos.PESO_PERIODO[n]}% del ciclo)` })));
    const inicial = Portal.contextoInicial();
    selGrupo.value = inicial.grupo; selCiclo.value = inicial.ciclo; selPeriodo.value = inicial.periodo;

    const fila = (etiqueta, valor) => Ui.el("div", {}, Ui.el("span", { texto: `${etiqueta}:` }), Ui.el("strong", { texto: valor }));

    function dibujar() {
        const g = Datos.grupo(selGrupo.value), c = Datos.ciclo(selCiclo.value);
        const porPeriodo = selTipo.value === "periodo";
        const p = selPeriodo.value;
        $("campoPeriodo").hidden = !porPeriodo;

        // Estado oficial: periodo trasladado (acta de periodo) o los tres periodos trasladados (registro del ciclo)
        const registros = (porPeriodo ? [p] : ["1", "2", "3"]).map(n => Notas.registro(g.id, c.id, n));
        const oficial = registros.every(r => r.estado === "trasladado");
        const datos = porPeriodo ? Notas.filasPeriodo(g.id, c.id, p) : Notas.filasCiclo(g.id, c.id);
        const titulo = porPeriodo ? "ACTA DE CALIFICACIONES" : "REGISTRO DE NOTAS DEL CICLO";

        const cab = datos.cabecera;
        const idxNota = cab.length - 2; // penúltima columna: nota (periodo o final)
        const filas = datos.cuerpo;
        const conNota = filas.filter(f => f[idxNota] !== "");
        const aprobados = conNota.filter(f => Notas.aprobado(f[idxNota])).length;
        const promedio = conNota.length ? conNota.reduce((t, f) => t + f[idxNota], 0) / conNota.length : null;
        const folios = registros.filter(r => r.folio).map(r => r.folio);

        datosActuales = {
            cabecera: cab, cuerpo: filas,
            nombreArchivo: `${porPeriodo ? "acta" : "registro-ciclo"}-${Csv.nombreSeguro(g.codigo)}-s${g.seccion}-${Csv.nombreSeguro(c.id)}${porPeriodo ? `-p${p}` : ""}.csv`
        };

        const hoja = $("hojaActa");
        hoja.innerHTML = "";
        if (!oficial) hoja.append(Ui.el("div", { class: "marca-agua", "aria-hidden": "true", texto: "BORRADOR" }));
        hoja.append(
            Ui.el("div", { class: "acta-encabezado" },
                Ui.el("img", { src: "img/images.png", alt: "Logo" }),
                Ui.el("div", {}, Ui.el("h2", { texto: titulo }), Ui.el("p", { texto: `Portal Docente · Año académico ${Datos.ANIO}` }))),
            Ui.el("div", { class: "acta-meta" },
                fila("Materia", Datos.nombreMateria(g)),
                fila("Grupo", `${g.codigo} · Sección ${g.seccion}`),
                fila("Ciclo", c.nombre),
                fila("Periodo", porPeriodo ? `Periodo ${p} (${Datos.PESO_PERIODO[p]}% del ciclo)` : "Periodos 1, 2 y 3"),
                fila("Horario", `${g.dia} · ${g.horario}`),
                fila("Docente", Portal.nombreVisible()),
                fila("Emitida el", Ui.formatoFecha(Datos.fechaISO())),
                fila("Estado", oficial ? "Trasladada a Registro" : "Borrador (no trasladada a Registro)"),
                ...(folios.length ? [fila(folios.length > 1 ? "Folios" : "Folio", folios.join(" · "))] : [])),
            Ui.el("div", { style: "overflow-x:auto" }, Ui.el("table", { class: "acta-tabla" },
                Ui.el("thead", {}, Ui.el("tr", {}, Ui.el("th", { class: "num", texto: "#" }), cab.map((t, i) => Ui.el("th", { class: i >= 2 ? "num" : "", texto: t })))),
                Ui.el("tbody", {}, filas.map((f, n) => Ui.el("tr", {},
                    Ui.el("td", { class: "num", texto: String(n + 1) }),
                    f.map((v, i) => {
                        const esResultado = i === f.length - 1;
                        const texto = typeof v === "number" ? v.toFixed(2) : (v === "" ? "—" : v);
                        return Ui.el("td", { class: `${i >= 2 ? "num" : ""}${esResultado && v === "Reprobado" ? " reprobado" : ""}`.trim(), texto });
                    })))))),
            Ui.el("div", { class: "acta-estadistica" },
                Ui.el("div", {}, "Estudiantes: ", Ui.el("strong", { texto: String(filas.length) })),
                Ui.el("div", {}, "Aprobados: ", Ui.el("strong", { texto: String(aprobados) })),
                Ui.el("div", {}, "Reprobados: ", Ui.el("strong", { texto: String(conNota.length - aprobados) })),
                Ui.el("div", {}, "Pendientes: ", Ui.el("strong", { texto: String(filas.length - conNota.length) })),
                Ui.el("div", {}, "Promedio: ", Ui.el("strong", { texto: promedio === null ? "—" : promedio.toFixed(2) })),
                Ui.el("div", {}, "Nota mínima de aprobación: ", Ui.el("strong", { texto: Datos.ajustes().notaMinima.toFixed(1) }))),
            Ui.el("div", { class: "acta-firmas" }, Ui.el("div", { texto: `${Portal.nombreVisible()} · Docente` }), Ui.el("div", { texto: "Registro Académico · Sello y firma" })),
            Ui.el("p", { class: "acta-pie", texto: `Generada desde el Portal Docente el ${Ui.formatoFechaHora(Date.now())} con las notas guardadas a esa fecha.` }));

        const aviso = $("avisoActa");
        aviso.hidden = oficial && conNota.length > 0;
        $("textoAvisoActa").textContent = !conNota.length
            ? "Todavía no hay notas guardadas para este documento. Registra y guarda las calificaciones en la sección Calificaciones."
            : "Este documento es un borrador: el periodo aún no se trasladó a Registro, por eso se imprime con la marca de agua «BORRADOR».";
        document.title = `${titulo.charAt(0) + titulo.slice(1).toLowerCase()} ${g.codigo}-${g.seccion} ${c.nombre} - Portal Docente`;
        Ui.iconos();
    }

    [selGrupo, selCiclo, selTipo, selPeriodo].forEach(s => s.addEventListener("change", dibujar));
    $("imprimirActa").addEventListener("click", () => window.print());
    $("exportarActa").addEventListener("click", () => Csv.descargar(datosActuales.nombreArchivo, [datosActuales.cabecera, ...datosActuales.cuerpo]));
    dibujar();
})();
