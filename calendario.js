"use strict";
(function () {
    const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const ABREV = MESES.map(m => m.slice(0, 3).toUpperCase());
    const hoy = Datos.fechaISO();
    const eventos = Datos.EVENTOS.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
    const proximo = eventos.find(e => e.fecha >= hoy);

    let [anio, mes] = hoy.split("-").map(Number); // mes 1-12

    function estado(e) {
        if (e.fecha < hoy) return { clase: "finalizada", texto: "Finalizada", icono: "check" };
        if (e === proximo) return { clase: "pendiente", texto: "Próximo", icono: "clock" };
        return { clase: "activo", texto: "Programado", icono: "clock" };
    }

    function dibujar() {
        const prefijo = `${anio}-${String(mes).padStart(2, "0")}`;
        const delMes = eventos.filter(e => e.fecha.startsWith(prefijo));
        document.getElementById("tituloMes").textContent = `${MESES[mes - 1]} ${anio}`;

        const lista = document.getElementById("eventosMes");
        lista.innerHTML = "";
        if (!delMes.length) lista.appendChild(Ui.el("p", { class: "vacio", texto: "No hay actividades programadas este mes." }));
        delMes.forEach(e => {
            const st = estado(e);
            lista.appendChild(Ui.el("div", { class: "evento-calendario" },
                Ui.el("div", { class: `evento-fecha${st.clase === "finalizada" ? " finalizada" : ""}` },
                    Ui.el("strong", { texto: e.fecha.slice(8) }), Ui.el("span", { texto: ABREV[mes - 1] })),
                Ui.el("div", { class: "evento-detalle" },
                    Ui.el("span", { class: `evento-tipo ${st.clase === "finalizada" ? "gris" : e.color}`, texto: e.tipo }),
                    Ui.el("h3", { texto: e.titulo }),
                    Ui.el("p", { texto: e.detalle }),
                    Ui.el("small", {}, Ui.el("i", { "data-lucide": st.icono }), st.clase === "finalizada" ? "Finalizada" : e.hora)),
                Ui.el("span", { class: `evento-estado ${st.clase}`, texto: st.texto })));
        });

        const cuenta = tipos => delMes.filter(e => tipos.includes(e.tipo)).length;
        const resumen = document.getElementById("resumenMes");
        resumen.innerHTML = "";
        const fila = (et, val) => resumen.appendChild(Ui.el("div", { class: "resumen-item" }, Ui.el("span", { texto: et }), Ui.el("strong", { texto: String(val) })));
        fila("Evaluaciones", cuenta(["EVALUACIÓN"]));
        fila("Entregas", cuenta(["CALIFICACIONES", "PROYECTO"]));
        fila("Actividades", cuenta(["ACTIVIDAD"]));
        const sig = delMes.find(e => e.fecha >= hoy);
        fila("Próxima actividad", sig ? `${Number(sig.fecha.slice(8))} ${ABREV[mes - 1]}` : "—");
        Ui.iconos();
    }

    function mover(delta) {
        mes += delta;
        if (mes < 1) { mes = 12; anio--; }
        if (mes > 12) { mes = 1; anio++; }
        dibujar();
    }
    document.getElementById("mesAnterior").addEventListener("click", () => mover(-1));
    document.getElementById("mesSiguiente").addEventListener("click", () => mover(1));
    document.getElementById("mesHoy").addEventListener("click", () => { [anio, mes] = hoy.split("-").map(Number); dibujar(); });
    dibujar();
})();
