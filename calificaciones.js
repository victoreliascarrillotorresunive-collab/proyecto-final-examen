"use strict";

const $ = id => document.getElementById(id);
const grupo = $("grupo");
const ciclo = $("ciclo");
const periodo = $("periodo");
const listaEvaluaciones = $("listaEvaluaciones");
const agregarEvaluacion = $("agregarEvaluacion");
const guardarConfiguracion = $("guardarConfiguracion");
const estadoPorcentajes = $("estadoPorcentajes");
const mensajeConfiguracion = $("mensajeConfiguracion");
const encabezadoCalificaciones = $("encabezadoCalificaciones");
const cuerpoCalificaciones = $("cuerpoCalificaciones");
const guardarCalificaciones = $("guardarCalificaciones");
const mensajeCalificaciones = $("mensajeCalificaciones");

let evaluaciones = [];
let bloqueado = false;

const ctx = () => [grupo.value, ciclo.value, periodo.value];
const estudiantes = () => Datos.estudiantes(grupo.value);
const usuarioActual = () => (Sesion.actual() || {}).usuario || "docente";

function mostrarMensaje(elemento, texto, correcto = false) {
    elemento.textContent = texto;
    elemento.style.color = correcto ? "#2e7d32" : "#c62828";
}

/* Guarda la configuración al editar, solo si es válida y el periodo no está bloqueado. */
function persistirConfigSiValida() {
    if (bloqueado) return;
    if (evaluaciones.every(e => e.nombre.trim()) && Notas.totalPorcentaje(evaluaciones) <= 100 + Notas.TOLERANCIA) {
        Notas.guardarEvaluaciones(...ctx(), evaluaciones);
    }
}

/* ------------------------------------------------------------------ */
/* Carga y dibujo                                                      */
/* ------------------------------------------------------------------ */
function cargarConfiguracion() {
    evaluaciones = Notas.evaluaciones(...ctx());
    bloqueado = Notas.bloqueado(...ctx());
    mensajeCalificaciones.textContent = "";
    dibujarBanner();
    dibujarEvaluaciones();
    dibujarTabla();
    actualizarResumenCiclo();
    actualizarEstadoTabla();
    dibujarRegistro();
    $("enlaceActa").href = `actas.html?grupo=${grupo.value}&ciclo=${ciclo.value}&periodo=${periodo.value}`;
    $("cantidadEstudiantes").textContent = `${estudiantes().length} estudiantes en el grupo`;
    guardarCalificaciones.disabled = bloqueado;
    guardarConfiguracion.disabled = bloqueado;
    Ui.iconos();
}

function dibujarBanner() {
    const banner = $("bannerBloqueo");
    banner.hidden = !bloqueado;
    if (!bloqueado) return;
    const r = Notas.registro(...ctx());
    $("textoBloqueo").textContent = `Este periodo fue trasladado a Registro el ${Ui.formatoFechaHora(r.fecha)} (folio ${r.folio}). ` +
        "Las evaluaciones y las notas están bloqueadas y no se pueden modificar.";
}

function dibujarEvaluaciones() {
    listaEvaluaciones.innerHTML = "";
    evaluaciones.forEach((evaluacion, indice) => {
        const fila = document.createElement("div");
        fila.className = "fila-evaluacion";

        const etiquetaNombre = document.createElement("label");
        etiquetaNombre.textContent = `Evaluación ${indice + 1}`;
        const nombre = document.createElement("input");
        nombre.type = "text";
        nombre.value = evaluacion.nombre;
        nombre.maxLength = 80;
        nombre.disabled = bloqueado;
        nombre.setAttribute("aria-label", `Nombre de evaluación ${indice + 1}`);
        nombre.addEventListener("input", () => {
            evaluacion.nombre = nombre.value;
            actualizarEncabezadoSinRedibujar();
            persistirConfigSiValida();
        });
        etiquetaNombre.appendChild(nombre);

        const etiquetaPorcentaje = document.createElement("label");
        etiquetaPorcentaje.textContent = "Porcentaje (%)";
        const porcentaje = document.createElement("input");
        porcentaje.type = "number";
        porcentaje.min = "0";
        porcentaje.max = "100";
        porcentaje.step = "1";
        porcentaje.value = evaluacion.porcentaje;
        porcentaje.disabled = bloqueado;
        porcentaje.setAttribute("aria-label", `Porcentaje de ${evaluacion.nombre}`);
        porcentaje.addEventListener("input", () => {
            evaluacion.porcentaje = porcentaje.value === "" ? 0 : Number(porcentaje.value);
            actualizarEstadoPorcentajes();
            actualizarEncabezadoSinRedibujar();
            persistirConfigSiValida();
            actualizarTodo();
        });
        etiquetaPorcentaje.appendChild(porcentaje);

        const etiquetaEstado = document.createElement("label");
        etiquetaEstado.className = "campo-estado-evaluacion";
        etiquetaEstado.textContent = "Estado";
        const selectorEstado = document.createElement("select");
        selectorEstado.disabled = bloqueado;
        selectorEstado.setAttribute("aria-label", `Estado de ${evaluacion.nombre}`);
        [{ value: "pendiente", label: "Pendiente" }, { value: "activo", label: "Activa" }, { value: "finalizada", label: "Finalizada" }].forEach(opcion => {
            const option = document.createElement("option");
            option.value = opcion.value;
            option.textContent = opcion.label;
            selectorEstado.appendChild(option);
        });
        selectorEstado.value = evaluacion.estado;
        selectorEstado.addEventListener("change", () => {
            evaluacion.estado = selectorEstado.value;
            persistirConfigSiValida();
            mostrarMensaje(mensajeConfiguracion, `Estado de «${evaluacion.nombre}» actualizado y sincronizado.`, true);
        });
        etiquetaEstado.appendChild(selectorEstado);

        const abrir = document.createElement("a");
        abrir.className = "boton-abrir-evaluacion";
        const parametros = new URLSearchParams({ grupo: grupo.value, ciclo: ciclo.value, periodo: periodo.value, evaluacion: evaluacion.id });
        abrir.href = `evaluaciones.html?${parametros.toString()}`;
        abrir.addEventListener("click", persistirConfigSiValida);
        abrir.textContent = "Ver evaluación";
        abrir.title = `Abrir ${evaluacion.nombre} en la página de Evaluaciones`;

        const eliminar = document.createElement("button");
        eliminar.type = "button";
        eliminar.className = "boton-eliminar";
        eliminar.textContent = "Eliminar";
        eliminar.disabled = bloqueado || evaluaciones.length <= 1;
        eliminar.addEventListener("click", async () => {
            const ok = await Ui.modal({
                titulo: "Eliminar evaluación",
                cuerpo: Ui.el("p", { texto: `¿Eliminar la evaluación «${evaluacion.nombre}»? Sus calificaciones de este periodo también dejarán de mostrarse.` }),
                acciones: [{ texto: "Cancelar", valor: false }, { texto: "Eliminar", tipo: "peligro", valor: true }]
            });
            if (!ok) return;
            evaluaciones = evaluaciones.filter(item => item.id !== evaluacion.id);
            const notas = Notas.notas(...ctx());
            Object.values(notas).forEach(est => delete est[evaluacion.id]);
            Notas.guardarNotas(...ctx(), notas);
            Notas.guardarEvaluaciones(...ctx(), evaluaciones);
            dibujarEvaluaciones();
            dibujarTabla();
            actualizarTodo();
        });
        fila.append(etiquetaNombre, etiquetaPorcentaje, etiquetaEstado, abrir, eliminar);
        listaEvaluaciones.appendChild(fila);
    });
    actualizarEstadoPorcentajes();
}

function actualizarEstadoPorcentajes() {
    const total = Notas.totalPorcentaje(evaluaciones);
    estadoPorcentajes.textContent = `Total: ${total.toFixed(2)}%`;
    estadoPorcentajes.classList.toggle("estado-error", total > 100);
    estadoPorcentajes.classList.toggle("estado-correcto", Math.abs(total - 100) < Notas.TOLERANCIA);
    agregarEvaluacion.hidden = bloqueado || total >= 100;
    if (bloqueado) {
        mostrarMensaje(mensajeConfiguracion, "Periodo trasladado a Registro: la configuración está bloqueada.", true);
    } else if (total > 100) {
        mostrarMensaje(mensajeConfiguracion, "El porcentaje total supera el 100%. Ajusta los porcentajes antes de guardar.");
    } else if (Math.abs(total - 100) < Notas.TOLERANCIA) {
        mostrarMensaje(mensajeConfiguracion, "La suma de porcentajes es 100%. Puedes registrar calificaciones.", true);
    } else {
        mostrarMensaje(mensajeConfiguracion, `Falta asignar ${(100 - total).toFixed(2)}% para completar el periodo.`);
    }
}

function actualizarEncabezadoSinRedibujar() {
    encabezadoCalificaciones.querySelectorAll("th[data-evaluacion]").forEach(th => {
        const evaluacion = evaluaciones.find(item => item.id === th.dataset.evaluacion);
        if (evaluacion) th.textContent = `${evaluacion.nombre} (${Number(evaluacion.porcentaje)}%)`;
    });
}

function dibujarTabla() {
    encabezadoCalificaciones.innerHTML = "";
    cuerpoCalificaciones.innerHTML = "";
    const filaTitulos = document.createElement("tr");
    ["#", "Estudiante", "Carné"].forEach(texto => {
        const th = document.createElement("th");
        th.textContent = texto;
        filaTitulos.appendChild(th);
    });
    evaluaciones.forEach(evaluacion => {
        const th = document.createElement("th");
        th.dataset.evaluacion = evaluacion.id;
        th.textContent = `${evaluacion.nombre} (${Number(evaluacion.porcentaje)}%)`;
        filaTitulos.appendChild(th);
    });
    ["Nota del periodo", "Estado del ciclo"].forEach(texto => {
        const th = document.createElement("th");
        th.textContent = texto;
        filaTitulos.appendChild(th);
    });
    encabezadoCalificaciones.appendChild(filaTitulos);

    const guardadas = Notas.notas(...ctx());
    estudiantes().forEach((estudiante, indice) => {
        const fila = document.createElement("tr");
        fila.dataset.estudiante = estudiante.id;
        [String(indice + 1), estudiante.nombre, estudiante.id].forEach(texto => {
            const td = document.createElement("td");
            td.textContent = texto;
            fila.appendChild(td);
        });
        evaluaciones.forEach(evaluacion => {
            const td = document.createElement("td");
            const input = document.createElement("input");
            input.type = "number"; input.min = "0"; input.max = "10"; input.step = "0.01";
            input.placeholder = "0.00";
            input.value = guardadas[estudiante.id]?.[evaluacion.id] ?? "";
            input.dataset.evaluacion = evaluacion.id;
            input.disabled = bloqueado;
            input.setAttribute("aria-label", `${estudiante.nombre}: ${evaluacion.nombre}`);
            input.addEventListener("input", actualizarTodo);
            td.appendChild(input);
            fila.appendChild(td);
        });
        const tdNota = document.createElement("td");
        tdNota.className = "nota-periodo";
        fila.appendChild(tdNota);
        const tdEstado = document.createElement("td");
        tdEstado.className = "estado-ciclo";
        fila.appendChild(tdEstado);
        cuerpoCalificaciones.appendChild(fila);
    });
    actualizarResultadosTabla();
}

/* ------------------------------------------------------------------ */
/* Cálculos                                                            */
/* ------------------------------------------------------------------ */
function leerNotasDesdeTabla() {
    const datos = {};
    cuerpoCalificaciones.querySelectorAll("tr").forEach(fila => {
        const id = fila.dataset.estudiante;
        datos[id] = {};
        fila.querySelectorAll("input[data-evaluacion]").forEach(input => {
            if (input.value !== "") datos[id][input.dataset.evaluacion] = Number(input.value);
        });
    });
    return datos;
}

/* Notas P1, P2, P3 y final de un estudiante: la del periodo actual sale de la tabla
   (si ya está completa); las demás, de lo guardado. */
function notasDelCiclo(estudianteId, notaTabla) {
    const g = Notas.notasCiclo(grupo.value, ciclo.value)[estudianteId] || {};
    const p = { 1: g.p1 ?? null, 2: g.p2 ?? null, 3: g.p3 ?? null };
    if (notaTabla !== null) p[periodo.value] = notaTabla;
    return { p, final: Notas.notaFinalCiclo(p[1], p[2], p[3]) };
}

function actualizarResultadosTabla() {
    const datos = leerNotasDesdeTabla();
    cuerpoCalificaciones.querySelectorAll("tr").forEach(fila => {
        const nota = Notas.notaPeriodo(evaluaciones, datos[fila.dataset.estudiante]);
        fila.querySelector(".nota-periodo").textContent = nota === null ? "Pendiente" : nota.toFixed(2);
        const { final } = notasDelCiclo(fila.dataset.estudiante, nota);
        fila.querySelector(".estado-ciclo").textContent = final === null ? "Pendiente" : (Notas.aprobado(final) ? "Aprobado" : "Reprobado");
    });
}

function actualizarResumenCiclo() {
    const contenedor = $("resumenCiclosPorEstudiante");
    if (!contenedor) return;
    const tabla = leerNotasDesdeTabla();
    contenedor.innerHTML = "";

    estudiantes().forEach(estudiante => {
        const { p, final } = notasDelCiclo(estudiante.id, Notas.notaPeriodo(evaluaciones, tabla[estudiante.id]));
        const tarjeta = document.createElement("article");
        tarjeta.className = "resumen-estudiante";

        const encabezado = document.createElement("div");
        encabezado.className = "resumen-estudiante-encabezado";
        const nombre = document.createElement("strong");
        nombre.textContent = estudiante.nombre;
        const carne = document.createElement("span");
        carne.textContent = `Carné: ${estudiante.id}`;
        encabezado.append(nombre, carne);

        const periodos = document.createElement("div");
        periodos.className = "resumen-periodos";
        [[`Periodo 1 (${Datos.PESO_PERIODO[1]}%)`, p[1]], [`Periodo 2 (${Datos.PESO_PERIODO[2]}%)`, p[2]], [`Periodo 3 (${Datos.PESO_PERIODO[3]}%)`, p[3]]].forEach(([etiqueta, nota]) => {
            const item = document.createElement("div");
            const label = document.createElement("span");
            label.textContent = etiqueta;
            const valor = document.createElement("strong");
            valor.textContent = nota === null ? "Pendiente" : Number(nota).toFixed(2);
            item.append(label, valor);
            periodos.appendChild(item);
        });

        const itemFinal = document.createElement("div");
        itemFinal.className = "resumen-final";
        const labelFinal = document.createElement("span");
        labelFinal.textContent = "Nota final del ciclo";
        const valorFinal = document.createElement("strong");
        valorFinal.textContent = final === null ? "Pendiente" : `${final.toFixed(2)} · ${Notas.aprobado(final) ? "Aprobado" : "Reprobado"}`;
        itemFinal.append(labelFinal, valorFinal);
        periodos.appendChild(itemFinal);

        tarjeta.append(encabezado, periodos);
        contenedor.appendChild(tarjeta);
    });
}

function hayCambiosSinGuardar() {
    const enTabla = leerNotasDesdeTabla();
    const guardadas = Notas.notas(...ctx());
    return estudiantes().some(a => evaluaciones.some(e => {
        const x = enTabla[a.id]?.[e.id];
        const y = guardadas[a.id]?.[e.id];
        return (x === undefined ? null : x) !== (y === undefined ? null : Number(y));
    }));
}

function actualizarEstadoTabla() {
    const chip = $("estadoTabla");
    const guardadas = Notas.notas(...ctx());
    const completoGuardado = estudiantes().every(a => Notas.notaPeriodo(evaluaciones, guardadas[a.id]) !== null);
    let texto = "Borrador", clase = "chip";
    if (bloqueado) { texto = "Trasladado a Registro"; clase = "chip bloqueado"; }
    else if (completoGuardado && !hayCambiosSinGuardar()) { texto = "Guardado"; clase = "chip ok"; }
    chip.textContent = texto;
    chip.className = clase;
}

function actualizarTodo() {
    actualizarResultadosTabla();
    actualizarResumenCiclo();
    actualizarEstadoTabla();
    dibujarRegistro();
}

/* ------------------------------------------------------------------ */
/* Traslado a Registro                                                 */
/* ------------------------------------------------------------------ */
function dibujarRegistro() {
    const caja = $("contenidoRegistro");
    const chip = $("estadoRegistro");
    caja.innerHTML = "";
    const r = Notas.registro(...ctx());

    if (bloqueado) {
        chip.textContent = "Trasladado";
        chip.className = "chip bloqueado";
        caja.append(
            Ui.el("div", { class: "datos-registro" },
                Ui.el("div", {}, Ui.el("span", { texto: "Folio de Registro" }), Ui.el("strong", { texto: r.folio })),
                Ui.el("div", {}, Ui.el("span", { texto: "Fecha del traslado" }), Ui.el("strong", { texto: Ui.formatoFechaHora(r.fecha) })),
                Ui.el("div", {}, Ui.el("span", { texto: "Trasladado por" }), Ui.el("strong", { texto: r.usuario }))));
        if (r.reapertura) {
            caja.append(Ui.el("p", { class: "texto-ayuda", texto: `Solicitud de reapertura enviada (${Ui.formatoFechaHora(r.reapertura.fecha)}). Motivo: ${r.reapertura.motivo.replace(/[.\s]+$/, "")}. Está pendiente de respuesta de Registro Académico.` }));
        } else {
            caja.append(Ui.el("p", { class: "texto-ayuda", texto: "Para corregir una nota debes pedir a Registro Académico que reabra el periodo." }),
                Ui.el("div", { class: "barra-acciones", style: "margin-top:12px" },
                    Ui.el("button", { type: "button", class: "btn secundario", onclick: solicitarReapertura }, Ui.el("i", { "data-lucide": "unlock" }), "Solicitar reapertura")));
        }
        Ui.iconos();
        return;
    }

    const requisitos = [...Notas.requisitosTraslado(...ctx()), { ok: !hayCambiosSinGuardar(), texto: "No hay cambios sin guardar en la tabla de calificaciones." }];
    const listo = requisitos.every(x => x.ok);
    chip.textContent = listo ? "Listo para trasladar" : "Requisitos pendientes";
    chip.className = listo ? "chip ok" : "chip";
    caja.append(
        Ui.el("p", { class: "texto-ayuda", texto: "Requisitos para trasladar el periodo a Registro:" }),
        Ui.el("ul", { class: "requisitos" }, requisitos.map(x =>
            Ui.el("li", { class: x.ok ? "si" : "no" }, Ui.el("span", { class: "marca", texto: x.ok ? "✓" : "✕" }), x.texto))),
        Ui.el("button", { type: "button", class: "btn acento", disabled: !listo, onclick: trasladarARegistro }, Ui.el("i", { "data-lucide": "send" }), "Trasladar a Registro"));
    Ui.iconos();
}

async function trasladarARegistro() {
    const g = Datos.grupo(grupo.value);
    const guardadas = Notas.notas(...ctx());
    const finales = estudiantes().map(a => Notas.notaPeriodo(evaluaciones, guardadas[a.id]));
    const aprobados = finales.filter(n => Notas.aprobado(n)).length;
    const ok = await Ui.modal({
        titulo: "Trasladar a Registro",
        cuerpo: [
            Ui.el("p", { texto: `${Datos.etiquetaGrupo(g)} — ${Datos.ciclo(ciclo.value).nombre}, Periodo ${periodo.value}.` }),
            Ui.el("p", { texto: `Se trasladarán las notas de ${finales.length} estudiantes (${aprobados} aprobados y ${finales.length - aprobados} reprobados en este periodo).` }),
            Ui.el("p", {}, Ui.el("strong", { texto: "Después del traslado no podrás modificar las evaluaciones ni las notas de este periodo." }),
                " Las evaluaciones se marcarán como finalizadas. Para corregir algo tendrás que solicitar la reapertura a Registro.")
        ],
        acciones: [{ texto: "Cancelar", valor: false }, { texto: "Trasladar y bloquear", tipo: "primario", valor: true }]
    });
    if (!ok) return;
    const resultado = Notas.trasladar(...ctx(), usuarioActual());
    if (!resultado.ok) { Ui.aviso(resultado.motivo, "error"); return; }
    Ui.aviso(`Periodo trasladado a Registro. Folio ${resultado.registro.folio}`);
    cargarConfiguracion();
}

async function solicitarReapertura() {
    const motivo = Ui.el("textarea", { maxlength: "300", "aria-label": "Motivo de la reapertura", placeholder: "Explica qué nota o evaluación necesitas corregir y por qué" });
    const ok = await Ui.modal({
        titulo: "Solicitar reapertura del periodo",
        cuerpo: [Ui.el("p", { texto: "Registro Académico revisará tu solicitud. Mientras tanto el periodo sigue bloqueado." }), motivo],
        acciones: [
            { texto: "Cancelar", valor: false },
            { texto: "Enviar solicitud", tipo: "primario", valor: true, validar: () => motivo.value.trim().length >= 10 || "Escribe un motivo de al menos 10 caracteres." }
        ]
    });
    if (!ok) return;
    Notas.solicitarReapertura(...ctx(), motivo.value.trim(), usuarioActual());
    Ui.aviso("Solicitud de reapertura enviada a Registro.", "info");
    dibujarRegistro();
}

/* ------------------------------------------------------------------ */
/* Subida masiva de notas (CSV)                                        */
/* ------------------------------------------------------------------ */
const COLUMNAS_IGNORADAS = ["#", "estudiante", "nombre", "nombres", "alumno", "nota del periodo", "nota periodo", "resultado", "estado del ciclo", "estado"];
const COLUMNAS_CARNE = ["carne", "carnet", "id", "codigo", "matricula"];

function analizarArchivo(texto) {
    const { filas } = Csv.parsear(texto);
    const informe = { errores: [], avisos: [], validas: [], estudiantesAfectados: 0, fatal: null };
    if (filas.length < 2) { informe.fatal = "El archivo está vacío o solo contiene la fila de títulos."; return informe; }

    const titulos = filas[0].celdas;
    const normalizados = titulos.map(Csv.normalizar);
    const colCarne = normalizados.findIndex(t => COLUMNAS_CARNE.includes(t));
    if (colCarne < 0) { informe.fatal = "No se encontró la columna «Carné». Descarga la plantilla para ver el formato esperado."; return informe; }
    const colNombre = normalizados.findIndex(t => ["estudiante", "nombre", "nombres", "alumno"].includes(t));

    // Cada columna se asocia a una evaluación por su nombre (se ignora el "(30%)" final).
    const columnas = [];
    titulos.forEach((titulo, i) => {
        if (i === colCarne) return;
        const limpio = Csv.normalizar(titulo.replace(/\(\s*[\d.,]+\s*%\s*\)\s*$/, ""));
        if (COLUMNAS_IGNORADAS.includes(limpio) || COLUMNAS_IGNORADAS.includes(normalizados[i])) return;
        const evaluacion = evaluaciones.find(e => Csv.normalizar(e.nombre) === limpio);
        if (evaluacion) columnas.push({ indice: i, evaluacion });
        else if (titulo) informe.avisos.push(`La columna «${titulo}» no coincide con ninguna evaluación de este periodo y se ignoró.`);
    });
    if (!columnas.length) {
        informe.fatal = `Ninguna columna coincide con las evaluaciones del periodo (${evaluaciones.map(e => e.nombre).join(", ")}).`;
        return informe;
    }

    const porCarne = new Map(estudiantes().map(a => [a.id, a]));
    const vistos = new Map();
    filas.slice(1).forEach(fila => {
        const carne = (fila.celdas[colCarne] || "").replace(/\s+/g, "");
        const estudiante = porCarne.get(carne);
        if (!estudiante) { informe.errores.push(`Línea ${fila.linea}: el carné «${carne || "(vacío)"}» no pertenece a este grupo.`); return; }
        if (vistos.has(carne)) { informe.errores.push(`Línea ${fila.linea}: el carné ${carne} está repetido (ya apareció en la línea ${vistos.get(carne)}); se omitió esta fila.`); return; }
        vistos.set(carne, fila.linea);
        if (colNombre >= 0 && fila.celdas[colNombre] && Csv.normalizar(fila.celdas[colNombre]) !== Csv.normalizar(estudiante.nombre)) {
            informe.avisos.push(`Línea ${fila.linea}: el nombre «${fila.celdas[colNombre]}» difiere del registrado para ${carne} («${estudiante.nombre}»). Se usó el carné.`);
        }
        let aportó = false;
        columnas.forEach(({ indice, evaluacion }) => {
            const crudo = fila.celdas[indice] ?? "";
            if (crudo === "") return;
            const n = Csv.numero(crudo);
            if (Number.isNaN(n)) informe.errores.push(`Línea ${fila.linea}, «${evaluacion.nombre}»: «${crudo}» no es un número.`);
            else if (n < 0 || n > 10) informe.errores.push(`Línea ${fila.linea}, «${evaluacion.nombre}»: ${crudo} está fuera del rango de 0 a 10.`);
            else { informe.validas.push({ estudiante: estudiante.id, evaluacion: evaluacion.id, valor: Notas.redondear(n) }); aportó = true; }
        });
        if (aportó) informe.estudiantesAfectados++;
    });

    const ausentes = estudiantes().length - vistos.size;
    if (ausentes > 0) informe.avisos.push(`${ausentes} estudiante(s) del grupo no aparecen en el archivo y conservan sus notas actuales.`);
    return informe;
}

function listaTexto(clase, items, maximo = 30) {
    const visibles = items.slice(0, maximo);
    return Ui.el("ul", { class: clase }, visibles.map(t => Ui.el("li", { texto: t })),
        items.length > maximo ? Ui.el("li", { texto: `… y ${items.length - maximo} más.` }) : null);
}

async function procesarImportacion(archivo) {
    const informe = analizarArchivo(await Csv.leerArchivo(archivo));
    if (informe.fatal) {
        await Ui.modal({ titulo: "No se pudo leer el archivo", cuerpo: Ui.el("p", { texto: informe.fatal }), acciones: [{ texto: "Cerrar", tipo: "primario", valor: true }] });
        return;
    }
    const cuerpo = [
        Ui.el("div", { class: "resumen-importacion" },
            Ui.el("div", { class: "bueno" }, Ui.el("strong", { texto: String(informe.validas.length) }), Ui.el("span", { texto: "notas válidas" })),
            Ui.el("div", { class: informe.errores.length ? "malo" : "" }, Ui.el("strong", { texto: String(informe.errores.length) }), Ui.el("span", { texto: "errores" })),
            Ui.el("div", {}, Ui.el("strong", { texto: String(informe.estudiantesAfectados) }), Ui.el("span", { texto: "estudiantes" })))
    ];
    if (informe.errores.length) cuerpo.push(listaTexto("lista-errores", informe.errores));
    if (informe.avisos.length) cuerpo.push(listaTexto("lista-avisos", informe.avisos, 10));
    cuerpo.push(Ui.el("p", { class: "texto-ayuda", texto: informe.validas.length
        ? "Las notas se cargarán en la tabla sin guardarse todavía: revísalas y pulsa «Guardar calificaciones». Las filas o celdas con error no se cargan."
        : "No hay ninguna nota válida para cargar. Corrige el archivo y vuelve a intentarlo." }));

    const acciones = [{ texto: "Cancelar", valor: false }];
    if (informe.validas.length) acciones.push({ texto: `Cargar ${informe.validas.length} notas válidas`, tipo: "primario", valor: true });
    const aplicar = await Ui.modal({ titulo: `Subida masiva · ${archivo.name}`, cuerpo, acciones });
    if (!aplicar) return;

    informe.validas.forEach(n => {
        const input = cuerpoCalificaciones.querySelector(`tr[data-estudiante="${CSS.escape(n.estudiante)}"] input[data-evaluacion="${CSS.escape(n.evaluacion)}"]`);
        if (input) input.value = n.valor;
    });
    actualizarTodo();
    mostrarMensaje(mensajeCalificaciones, `${informe.validas.length} notas cargadas en la tabla. Revísalas y pulsa «Guardar calificaciones» para conservarlas.`, true);
}

$("botonImportar").addEventListener("click", () => {
    if (bloqueado) return Ui.aviso("El periodo está trasladado a Registro: no se pueden cargar notas.", "error");
    $("archivoNotas").value = "";
    $("archivoNotas").click();
});
$("archivoNotas").addEventListener("change", async evento => {
    const archivo = evento.target.files[0];
    if (!archivo) return;
    if (archivo.size > 2 * 1024 * 1024) return Ui.aviso("El archivo supera los 2 MB. Revisa que sea el CSV correcto.", "error");
    try { await procesarImportacion(archivo); }
    catch (error) { console.error(error); Ui.aviso("No se pudo procesar el archivo.", "error"); }
});

$("botonPlantilla").addEventListener("click", () => {
    const filas = [["Carné", "Estudiante", ...evaluaciones.map(e => e.nombre)], ...estudiantes().map(a => [a.id, a.nombre, ...evaluaciones.map(() => "")])];
    Csv.descargar(`plantilla-notas-${nombreArchivoBase()}.csv`, filas);
});

/* ------------------------------------------------------------------ */
/* Exportación                                                         */
/* ------------------------------------------------------------------ */
function nombreArchivoBase() {
    const g = Datos.grupo(grupo.value);
    return `${Csv.nombreSeguro(g.codigo)}-s${g.seccion}-${Csv.nombreSeguro(ciclo.value)}-p${periodo.value}`;
}
function avisarCambiosSinGuardar() {
    if (!bloqueado && hayCambiosSinGuardar()) Ui.aviso("Se exportaron las notas guardadas; hay cambios en pantalla que aún no se guardaron.", "info");
}
$("exportarPeriodo").addEventListener("click", () => {
    const { cabecera, cuerpo } = Notas.filasPeriodo(...ctx());
    Csv.descargar(`notas-${nombreArchivoBase()}.csv`, [cabecera, ...cuerpo]);
    avisarCambiosSinGuardar();
});
$("exportarCiclo").addEventListener("click", () => {
    const { cabecera, cuerpo } = Notas.filasCiclo(grupo.value, ciclo.value);
    const g = Datos.grupo(grupo.value);
    Csv.descargar(`registro-ciclo-${Csv.nombreSeguro(g.codigo)}-s${g.seccion}-${Csv.nombreSeguro(ciclo.value)}.csv`, [cabecera, ...cuerpo]);
    avisarCambiosSinGuardar();
});

/* ------------------------------------------------------------------ */
/* Acciones de edición                                                 */
/* ------------------------------------------------------------------ */
agregarEvaluacion.addEventListener("click", () => {
    const total = Notas.totalPorcentaje(evaluaciones);
    if (bloqueado || total >= 100) return;
    evaluaciones.push({ id: `eval-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, nombre: `Nueva evaluación ${evaluaciones.length + 1}`, porcentaje: Math.max(0, Math.round((100 - total) * 100) / 100), estado: "pendiente" });
    dibujarEvaluaciones();
    dibujarTabla();
    persistirConfigSiValida();
    actualizarTodo();
});

guardarConfiguracion.addEventListener("click", () => {
    if (bloqueado) return;
    const total = Notas.totalPorcentaje(evaluaciones);
    if (evaluaciones.some(e => !e.nombre.trim())) return mostrarMensaje(mensajeConfiguracion, "Cada evaluación debe tener un nombre.");
    if (evaluaciones.some(e => !Number.isFinite(Number(e.porcentaje)) || Number(e.porcentaje) < 0 || Number(e.porcentaje) > 100)) return mostrarMensaje(mensajeConfiguracion, "Los porcentajes deben estar entre 0 y 100.");
    if (Math.abs(total - 100) > Notas.TOLERANCIA) return mostrarMensaje(mensajeConfiguracion, "No se puede guardar: los porcentajes deben sumar exactamente 100%.");
    Notas.guardarEvaluaciones(...ctx(), evaluaciones);
    mostrarMensaje(mensajeConfiguracion, "Configuración de evaluaciones guardada.", true);
    dibujarTabla();
    actualizarTodo();
});

guardarCalificaciones.addEventListener("click", () => {
    mensajeCalificaciones.textContent = "";
    if (bloqueado) return mostrarMensaje(mensajeCalificaciones, "El periodo está trasladado a Registro y no admite cambios.");
    if (!grupo.value) return mostrarMensaje(mensajeCalificaciones, "Selecciona un grupo.");
    if (!Notas.sumaCorrecta(evaluaciones)) return mostrarMensaje(mensajeCalificaciones, "Los porcentajes de las evaluaciones deben sumar exactamente 100%.");
    const filas = [...cuerpoCalificaciones.querySelectorAll("tr")];
    for (const fila of filas) {
        for (const input of fila.querySelectorAll("input")) {
            if (!Notas.esNota(input.value)) {
                mostrarMensaje(mensajeCalificaciones, "Completa todas las notas con valores entre 0 y 10.");
                input.focus();
                return;
            }
        }
    }
    const datos = leerNotasDesdeTabla();
    Notas.guardarNotas(...ctx(), datos);
    const delCiclo = Notas.notasCiclo(grupo.value, ciclo.value);
    filas.forEach(fila => {
        const id = fila.dataset.estudiante;
        delCiclo[id] = delCiclo[id] || {};
        delCiclo[id][`p${periodo.value}`] = Notas.redondear(Notas.notaPeriodo(evaluaciones, datos[id]));
    });
    Notas.guardarNotasCiclo(grupo.value, ciclo.value, delCiclo);
    actualizarTodo();
    mostrarMensaje(mensajeCalificaciones, "Calificaciones del periodo guardadas correctamente.", true);
});

/* ------------------------------------------------------------------ */
/* Arranque                                                            */
/* ------------------------------------------------------------------ */
Ui.llenarSelect(grupo, Datos.grupos().map(g => ({ valor: g.id, texto: Datos.etiquetaGrupo(g) })));
Ui.llenarSelect(ciclo, Datos.ciclos().map(c => ({ valor: c.id, texto: c.nombre })));
Ui.llenarSelect(periodo, [1, 2, 3].map(n => ({ valor: String(n), texto: `Periodo ${n} (${Datos.PESO_PERIODO[n]}% del ciclo)` })));

const inicial = Portal.contextoInicial();
grupo.value = inicial.grupo;
ciclo.value = inicial.ciclo;
periodo.value = inicial.periodo;

[grupo, ciclo, periodo].forEach(control => control.addEventListener("change", cargarConfiguracion));
cargarConfiguracion();

if (inicial.evaluacion) {
    const enlace = listaEvaluaciones.querySelector(`a[href*="evaluacion=${encodeURIComponent(inicial.evaluacion)}"]`);
    const fila = enlace?.closest(".fila-evaluacion");
    if (fila) {
        fila.classList.add("evaluacion-destacada");
        fila.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}
