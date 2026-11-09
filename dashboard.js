"use strict";
/* Panel de inicio: todas las cifras salen de los datos reales (grupos, notas guardadas, calendario). */
(function () {
    const ciclo = Datos.cicloActual();
    const periodo = Datos.periodoActual();
    const grupos = Datos.grupos();

    const pendientes = grupos.filter(g => !Notas.bloqueado(g.id, ciclo.id, periodo));
    const totalEvaluaciones = grupos.reduce((t, g) => t + Notas.evaluaciones(g.id, ciclo.id, periodo).length, 0);

    document.getElementById("statGrupos").textContent = grupos.length;
    document.getElementById("statEstudiantes").textContent = Datos.totalEstudiantes();
    document.getElementById("statEvaluaciones").textContent = totalEvaluaciones;
    document.getElementById("statPendientes").textContent = pendientes.length;

    const hoy = Datos.fechaISO();
    const proximos = Datos.EVENTOS.filter(e => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));

    /* Avisos */
    const avisos = document.getElementById("listaAvisos");
    function aviso(titulo, texto, pie, amarillo) {
        avisos.appendChild(Ui.el("div", { class: "aviso" },
            Ui.el("div", { class: `aviso-punto${amarillo ? " amarillo" : ""}` }),
            Ui.el("div", {}, Ui.el("strong", { texto: titulo }), Ui.el("p", { texto }), pie ? Ui.el("small", { texto: pie }) : null)));
    }
    const entrega = proximos.find(e => e.tipo === "CALIFICACIONES");
    if (entrega) {
        const dias = Math.round((new Date(entrega.fecha) - new Date(hoy)) / 86400000);
        aviso("Registro de calificaciones",
            `${entrega.titulo}: ${Ui.formatoFecha(entrega.fecha)}.`,
            dias === 0 ? "Vence hoy" : `Faltan ${dias} día${dias === 1 ? "" : "s"}`, dias <= 7);
    }
    if (pendientes.length) {
        aviso("Traslado a Registro pendiente",
            `${pendientes.length} de ${grupos.length} grupos aún no trasladan las notas del Periodo ${periodo} (${ciclo.nombre}).`,
            "Ve a Calificaciones para trasladarlas", true);
    } else {
        aviso("Todo al día", `Todos los grupos trasladaron el Periodo ${periodo} a Registro.`, "", false);
    }

    /* Próximas actividades */
    const lista = document.getElementById("listaEventos");
    const meses = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    if (!proximos.length) lista.appendChild(Ui.el("p", { class: "vacio", texto: "No hay actividades próximas." }));
    proximos.slice(0, 3).forEach(e => {
        const [, m, d] = e.fecha.split("-").map(Number);
        lista.appendChild(Ui.el("div", { class: "evento" },
            Ui.el("div", { class: "fecha" }, Ui.el("strong", { texto: String(d).padStart(2, "0") }), Ui.el("span", { texto: meses[m - 1] })),
            Ui.el("div", {}, Ui.el("strong", { texto: e.titulo }), Ui.el("span", { texto: e.detalle }))));
    });
})();
