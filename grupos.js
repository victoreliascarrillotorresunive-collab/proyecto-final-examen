"use strict";
(function () {
    const contenedor = document.getElementById("gruposLista");
    const ciclo = Datos.cicloActual();
    const periodo = Datos.periodoActual();
    const consulta = g => `grupo=${g.id}&ciclo=${ciclo.id}&periodo=${periodo}`;

    Datos.grupos().forEach(g => {
        const idDetalle = `detalle-${g.id}`;
        const detalle = Ui.el("div", { class: "grupo-detalle", id: idDetalle, hidden: true },
            Ui.el("div", { class: "barra-acciones" },
                Ui.el("a", { class: "btn primario", href: `calificaciones.html?${consulta(g)}` }, Ui.el("i", { "data-lucide": "clipboard-check" }), "Calificaciones"),
                Ui.el("a", { class: "btn secundario", href: `evaluaciones.html?${consulta(g)}` }, Ui.el("i", { "data-lucide": "file-text" }), "Evaluaciones"),
                Ui.el("a", { class: "btn secundario", href: `actas.html?${consulta(g)}` }, Ui.el("i", { "data-lucide": "file-spreadsheet" }), "Acta del periodo")),
            Ui.el("div", { class: "lista-estudiantes" }, Ui.el("table", {},
                Ui.el("thead", {}, Ui.el("tr", {}, ["#", "Carné", "Estudiante"].map(t => Ui.el("th", { texto: t })))),
                Ui.el("tbody", {}, Datos.estudiantes(g.id).map((a, i) =>
                    Ui.el("tr", {}, Ui.el("td", { texto: String(i + 1) }), Ui.el("td", { texto: a.id }), Ui.el("td", { texto: a.nombre })))))));

        const boton = Ui.el("button", { type: "button", class: "btn primario", "aria-expanded": "false", "aria-controls": idDetalle, texto: "Ver grupo" });
        boton.addEventListener("click", () => {
            const abierto = detalle.hidden;
            detalle.hidden = !abierto;
            boton.setAttribute("aria-expanded", String(abierto));
            boton.textContent = abierto ? "Ocultar grupo" : "Ver grupo";
        });

        contenedor.appendChild(Ui.el("div", { class: "grupo-bloque" },
            Ui.el("div", { class: "grupo-card" },
                Ui.el("div", { class: "grupo-info" },
                    Ui.el("span", { class: "codigo", texto: `${g.codigo} · Sección ${g.seccion}` }),
                    Ui.el("h2", { texto: Datos.nombreMateria(g) }),
                    Ui.el("p", {}, Ui.el("i", { "data-lucide": "clock" }), `${g.dia} · ${g.horario} · ${g.aula}`)),
                Ui.el("div", { class: "grupo-estudiantes" }, Ui.el("strong", { texto: String(Datos.estudiantes(g.id).length) }), Ui.el("span", { texto: "Estudiantes" })),
                boton),
            detalle));
    });
    Ui.iconos();
})();
