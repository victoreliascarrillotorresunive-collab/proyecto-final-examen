"use strict";

const grupoEvaluaciones = document.getElementById("grupoEvaluaciones");
const cicloEvaluaciones = document.getElementById("cicloEvaluaciones");
const periodoEvaluaciones = document.getElementById("periodoEvaluaciones");
const tarjetasEvaluaciones = document.getElementById("tarjetasEvaluaciones");
const formNuevaEvaluacion = document.getElementById("formNuevaEvaluacion");
const nombreNuevaEvaluacion = document.getElementById("nombreNuevaEvaluacion");
const porcentajeNuevaEvaluacion = document.getElementById("porcentajeNuevaEvaluacion");
const crearEvaluacion = document.getElementById("crearEvaluacion");
const totalPorcentajeEvaluaciones = document.getElementById("totalPorcentajeEvaluaciones");
const mensajeEvaluaciones = document.getElementById("mensajeEvaluaciones");
const ayudaNuevaEvaluacion = document.getElementById("ayudaNuevaEvaluacion");
const volverCalificaciones = document.getElementById("volverCalificaciones");

const ctxEv = () => [grupoEvaluaciones.value, cicloEvaluaciones.value, periodoEvaluaciones.value];
let bloqueadoEvaluaciones = false;
function leerConfiguracionEvaluaciones() { return Notas.evaluaciones(...ctxEv()); }
function guardarConfiguracionEvaluaciones(datos) { if (!bloqueadoEvaluaciones) Notas.guardarEvaluaciones(...ctxEv(), datos); }
function totalPorcentajeEvaluacionesActual() {
    return evaluacionesActuales.reduce((suma, item) => suma + (Number(item.porcentaje) || 0), 0);
}
function mostrarMensajeEvaluaciones(texto, correcto = false) {
    mensajeEvaluaciones.textContent = texto;
    mensajeEvaluaciones.style.color = correcto ? "#237443" : "#b42318";
}
function urlCalificaciones(idEvaluacion) {
    const parametros = new URLSearchParams({
        grupo: grupoEvaluaciones.value,
        ciclo: cicloEvaluaciones.value,
        periodo: periodoEvaluaciones.value
    });
    if (idEvaluacion) parametros.set("evaluacion", idEvaluacion);
    return `calificaciones.html?${parametros.toString()}`;
}
let evaluacionesActuales = [];

function actualizarTotalYFormulario() {
    const total = totalPorcentajeEvaluacionesActual();
    totalPorcentajeEvaluaciones.textContent = `Total: ${total.toFixed(2)}%`;
    totalPorcentajeEvaluaciones.classList.toggle("total-error", total > 100.0001);
    totalPorcentajeEvaluaciones.classList.toggle("total-correcto", Math.abs(total - 100) < 0.0001);
    const restante = Math.max(0, 100 - total);
    porcentajeNuevaEvaluacion.max = String(restante);
    porcentajeNuevaEvaluacion.placeholder = `Máximo ${restante.toFixed(2)}%`;
    crearEvaluacion.disabled = bloqueadoEvaluaciones || total >= 100;
    nombreNuevaEvaluacion.disabled = bloqueadoEvaluaciones;
    porcentajeNuevaEvaluacion.disabled = bloqueadoEvaluaciones;
    if (bloqueadoEvaluaciones) {
        ayudaNuevaEvaluacion.textContent = "Este periodo fue trasladado a Registro: no se pueden añadir evaluaciones.";
    } else if (total >= 100) {
        ayudaNuevaEvaluacion.textContent = "El total ya es 100%. Reduce primero el porcentaje de alguna evaluación para añadir otra.";
    } else {
        ayudaNuevaEvaluacion.textContent = `Queda un ${restante.toFixed(2)}% disponible. Puedes asignar una parte o todo ese porcentaje a la nueva evaluación.`;
    }
}

function renderizarEvaluaciones() {
    tarjetasEvaluaciones.innerHTML = "";
    evaluacionesActuales.forEach((evaluacion, indice) => {
        const tarjeta = document.createElement("article");
        tarjeta.className = "evaluacion-card";
        tarjeta.dataset.evaluacion = evaluacion.id;

        const icono = document.createElement("div");
        icono.className = "evaluacion-icono";
        icono.innerHTML = '<i data-lucide="file-text"></i>';

        const info = document.createElement("div");
        info.className = "evaluacion-info";
        const etiqueta = document.createElement("span");
        etiqueta.className = "codigo";
        const grupoActual = Datos.grupo(grupoEvaluaciones.value);
        etiqueta.textContent = `${grupoActual.codigo} · Sección ${grupoActual.seccion} · ${Datos.ciclo(cicloEvaluaciones.value).nombre.split(" - ")[0]} · Periodo ${periodoEvaluaciones.value}`;
        const estado = document.createElement("span");
        estado.className = `evaluacion-estado ${["pendiente", "activo", "finalizada"].includes(evaluacion.estado) ? evaluacion.estado : "pendiente"}`;
        estado.textContent = ({ pendiente: "Pendiente", activo: "Activa", finalizada: "Finalizada" })[estado.classList[1]];

        const selectorEstadoLabel = document.createElement("label");
        selectorEstadoLabel.className = "estado-evaluacion-label";
        selectorEstadoLabel.textContent = "Estado";
        const selectorEstado = document.createElement("select");
        selectorEstado.className = "selector-estado-evaluacion";
        selectorEstado.disabled = bloqueadoEvaluaciones;
        [{ value: "pendiente", label: "Pendiente" }, { value: "activo", label: "Activa" }, { value: "finalizada", label: "Finalizada" }].forEach(opcion => {
            const option = document.createElement("option");
            option.value = opcion.value;
            option.textContent = opcion.label;
            selectorEstado.appendChild(option);
        });
        selectorEstado.value = ["pendiente", "activo", "finalizada"].includes(evaluacion.estado) ? evaluacion.estado : "pendiente";
        selectorEstadoLabel.appendChild(selectorEstado);
        selectorEstado.addEventListener("change", () => {
            evaluacion.estado = selectorEstado.value;
            guardarConfiguracionEvaluaciones(evaluacionesActuales);
            renderizarEvaluaciones();
            mostrarMensajeEvaluaciones("Estado actualizado y sincronizado con Calificaciones.", true);
        });

        const nombre = document.createElement("input");
        nombre.className = "nombre-evaluacion-editable";
        nombre.type = "text";
        nombre.maxLength = 80;
        nombre.disabled = bloqueadoEvaluaciones;
        nombre.value = evaluacion.nombre;
        nombre.setAttribute("aria-label", `Nombre de la evaluación ${indice + 1}`);
        nombre.addEventListener("change", () => {
            const nuevoNombre = nombre.value.trim();
            if (!nuevoNombre) {
                nombre.value = evaluacion.nombre;
                mostrarMensajeEvaluaciones("El nombre de la evaluación no puede estar vacío.");
                return;
            }
            evaluacion.nombre = nuevoNombre;
            guardarConfiguracionEvaluaciones(evaluacionesActuales);
            renderizarEvaluaciones();
            mostrarMensajeEvaluaciones("Nombre actualizado y sincronizado con Calificaciones.", true);
        });

        const porcentajeLabel = document.createElement("label");
        porcentajeLabel.className = "porcentaje-evaluacion-label";
        porcentajeLabel.textContent = "Porcentaje (%)";
        const porcentaje = document.createElement("input");
        porcentaje.type = "number";
        porcentaje.min = "0";
        porcentaje.max = "100";
        porcentaje.step = "0.01";
        porcentaje.disabled = bloqueadoEvaluaciones;
        porcentaje.value = evaluacion.porcentaje;
        porcentajeLabel.appendChild(porcentaje);
        porcentaje.addEventListener("change", () => {
            const nuevoPorcentaje = Number(porcentaje.value);
            const totalSinActual = totalPorcentajeEvaluacionesActual() - Number(evaluacion.porcentaje || 0);
            if (!Number.isFinite(nuevoPorcentaje) || nuevoPorcentaje < 0 || nuevoPorcentaje > 100 || totalSinActual + nuevoPorcentaje > 100.0001) {
                porcentaje.value = evaluacion.porcentaje;
                mostrarMensajeEvaluaciones("El porcentaje debe ser válido y la suma no puede superar el 100%.");
                return;
            }
            evaluacion.porcentaje = nuevoPorcentaje;
            guardarConfiguracionEvaluaciones(evaluacionesActuales);
            renderizarEvaluaciones();
            mostrarMensajeEvaluaciones("Porcentaje actualizado y sincronizado con Calificaciones.", true);
        });

        const acciones = document.createElement("div");
        acciones.className = "acciones-tarjeta-evaluacion";
        const irCalificaciones = document.createElement("a");
        irCalificaciones.className = "boton-evaluacion";
        irCalificaciones.href = urlCalificaciones(evaluacion.id);
        irCalificaciones.textContent = "Registrar notas";
        const eliminar = document.createElement("button");
        eliminar.type = "button";
        eliminar.className = "boton-eliminar-evaluacion";
        eliminar.disabled = bloqueadoEvaluaciones;
        eliminar.textContent = "Eliminar";
        eliminar.addEventListener("click", async () => {
            const ok = await Ui.modal({
                titulo: "Eliminar evaluación",
                cuerpo: Ui.el("p", { texto: `¿Eliminar «${evaluacion.nombre}» de este grupo, ciclo y periodo?` }),
                acciones: [{ texto: "Cancelar", valor: false }, { texto: "Eliminar", tipo: "peligro", valor: true }]
            });
            if (!ok) return;
            evaluacionesActuales = evaluacionesActuales.filter(item => item.id !== evaluacion.id);
            guardarConfiguracionEvaluaciones(evaluacionesActuales);
            renderizarEvaluaciones();
            mostrarMensajeEvaluaciones("Evaluación eliminada de la configuración compartida.", true);
        });
        acciones.append(irCalificaciones, eliminar);
        info.append(etiqueta, nombre, estado, porcentajeLabel, selectorEstadoLabel);
        tarjeta.append(icono, info, acciones);
        tarjetasEvaluaciones.appendChild(tarjeta);
    });
    actualizarTotalYFormulario();
    if (window.lucide) window.lucide.createIcons();
}

function cargarEvaluaciones() {
    evaluacionesActuales = leerConfiguracionEvaluaciones();
    bloqueadoEvaluaciones = Notas.bloqueado(...ctxEv());
    const banner = document.getElementById("bannerBloqueo");
    banner.hidden = !bloqueadoEvaluaciones;
    if (bloqueadoEvaluaciones) {
        const r = Notas.registro(...ctxEv());
        document.getElementById("textoBloqueo").textContent = `Este periodo fue trasladado a Registro el ${Ui.formatoFechaHora(r.fecha)} (folio ${r.folio}). Las evaluaciones están bloqueadas y no se pueden modificar.`;
    }
    const parametros = new URLSearchParams(window.location.search);
    const idSolicitado = parametros.get("evaluacion");
    volverCalificaciones.href = urlCalificaciones(idSolicitado);
    renderizarEvaluaciones();
    if (idSolicitado) {
        requestAnimationFrame(() => {
            const tarjeta = tarjetasEvaluaciones.querySelector(`[data-evaluacion="${CSS.escape(idSolicitado)}"]`);
            if (tarjeta) {
                tarjeta.classList.add("evaluacion-destacada");
                tarjeta.scrollIntoView({ behavior: "smooth", block: "center" });
            } else {
                mostrarMensajeEvaluaciones("La evaluación solicitada no está en la configuración actual. Revisa el grupo, ciclo y periodo.");
            }
        });
    }
}

formNuevaEvaluacion.addEventListener("submit", evento => {
    evento.preventDefault();
    if (bloqueadoEvaluaciones) return mostrarMensajeEvaluaciones("El periodo está trasladado a Registro y no admite cambios.");
    const nombre = nombreNuevaEvaluacion.value.trim();
    const porcentaje = Number(porcentajeNuevaEvaluacion.value);
    const total = totalPorcentajeEvaluacionesActual();
    if (!nombre) return mostrarMensajeEvaluaciones("Escribe el nombre de la evaluación.");
    if (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100) return mostrarMensajeEvaluaciones("El porcentaje debe estar entre 0 y 100.");
    if (total + porcentaje > 100.0001) return mostrarMensajeEvaluaciones("La suma de los porcentajes no puede superar el 100%.");
    if (total >= 100) return mostrarMensajeEvaluaciones("Reduce primero otro porcentaje para dejar espacio a una nueva evaluación.");
    evaluacionesActuales.push({ id: `eval-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, nombre, porcentaje, estado: "pendiente" });
    guardarConfiguracionEvaluaciones(evaluacionesActuales);
    nombreNuevaEvaluacion.value = "";
    porcentajeNuevaEvaluacion.value = "";
    renderizarEvaluaciones();
    mostrarMensajeEvaluaciones("Evaluación creada y sincronizada con Calificaciones.", true);
});

[grupoEvaluaciones, cicloEvaluaciones, periodoEvaluaciones].forEach(control => control.addEventListener("change", cargarEvaluaciones));

Ui.llenarSelect(grupoEvaluaciones, Datos.grupos().map(g => ({ valor: g.id, texto: Datos.etiquetaGrupo(g) })));
Ui.llenarSelect(cicloEvaluaciones, Datos.ciclos().map(c => ({ valor: c.id, texto: c.nombre })));
Ui.llenarSelect(periodoEvaluaciones, [1, 2, 3].map(n => ({ valor: String(n), texto: `Periodo ${n} (${Datos.PESO_PERIODO[n]}%)` })));
const contextoPagina = Portal.contextoInicial();
grupoEvaluaciones.value = contextoPagina.grupo;
cicloEvaluaciones.value = contextoPagina.ciclo;
periodoEvaluaciones.value = contextoPagina.periodo;
cargarEvaluaciones();
