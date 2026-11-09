"use strict";
/* Acceso a evaluaciones y calificaciones guardadas, cálculo de notas,
   traslado a Registro (con bloqueo) y generación de datos para exportar. */
const Notas = (() => {
    const ESTADOS_EVALUACION = ["pendiente", "activo", "finalizada"];
    const TOLERANCIA = 0.0001;
    // Mismas claves que usaba la versión anterior, para no perder datos ya guardados.
    const claves = {
        config: (g, c, p) => `portal_eval_config_${g}_${c}_p${p}`,
        notas: (g, c, p) => `portal_eval_notas_${g}_${c}_p${p}`,
        ciclo: (g, c) => `portal_ciclo_notas_${g}_${c}`,
        registro: (g, c, p) => `portal_registro_${g}_${c}_p${p}`
    };

    function leer(clave, alternativo) {
        try { return JSON.parse(localStorage.getItem(clave)) ?? alternativo; }
        catch (e) { console.error(`No se pudo leer ${clave}`, e); return alternativo; }
    }
    function guardar(clave, valor) { localStorage.setItem(clave, JSON.stringify(valor)); }

    const redondear = n => Math.round(n * 100) / 100;
    const esNota = v => v !== "" && v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 10;
    const aprobado = nota => nota !== null && nota !== undefined && nota >= Datos.ajustes().notaMinima;

    function normalizarEvaluacion(e) {
        return { ...e, estado: ESTADOS_EVALUACION.includes(e.estado) ? e.estado : "pendiente" };
    }
    function evaluaciones(g, c, p) {
        const guardadas = leer(claves.config(g, c, p), null);
        const lista = Array.isArray(guardadas) && guardadas.length ? guardadas : structuredClone(Datos.EVALUACIONES_BASE);
        return lista.map(normalizarEvaluacion);
    }
    function guardarEvaluaciones(g, c, p, lista) { guardar(claves.config(g, c, p), lista); }
    const totalPorcentaje = evals => evals.reduce((t, e) => t + (Number(e.porcentaje) || 0), 0);
    const sumaCorrecta = evals => Math.abs(totalPorcentaje(evals) - 100) <= TOLERANCIA;

    const notas = (g, c, p) => leer(claves.notas(g, c, p), {});
    const guardarNotas = (g, c, p, datos) => guardar(claves.notas(g, c, p), datos);
    const notasCiclo = (g, c) => leer(claves.ciclo(g, c), {});
    const guardarNotasCiclo = (g, c, datos) => guardar(claves.ciclo(g, c), datos);

    function notaPeriodo(evals, notasEstudiante) {
        if (!sumaCorrecta(evals)) return null;
        if (evals.some(e => !esNota(notasEstudiante?.[e.id]))) return null;
        return evals.reduce((t, e) => t + Number(notasEstudiante[e.id]) * Number(e.porcentaje) / 100, 0);
    }
    function notaFinalCiclo(p1, p2, p3) {
        if ([p1, p2, p3].some(n => n === null || n === undefined)) return null;
        const w = Datos.PESO_PERIODO;
        return p1 * w[1] / 100 + p2 * w[2] / 100 + p3 * w[3] / 100;
    }

    /* ---- Registro Académico ---- */
    function registro(g, c, p) { return leer(claves.registro(g, c, p), { estado: "abierto" }); }
    const bloqueado = (g, c, p) => registro(g, c, p).estado === "trasladado";

    // Revisa los datos GUARDADOS (no lo que hay en pantalla). Devuelve la lista de requisitos.
    function requisitosTraslado(g, c, p) {
        const evals = evaluaciones(g, c, p);
        const guardadas = notas(g, c, p);
        const delCiclo = notasCiclo(g, c);
        const alumnos = Datos.estudiantes(g);
        const completos = alumnos.filter(a => notaPeriodo(evals, guardadas[a.id]) !== null).length;
        const desfasados = alumnos.filter(a => {
            const n = notaPeriodo(evals, guardadas[a.id]);
            return n !== null && Math.abs((delCiclo[a.id]?.[`p${p}`] ?? NaN) - redondear(n)) > TOLERANCIA;
        }).length;
        return [
            { ok: sumaCorrecta(evals), texto: "Los porcentajes de las evaluaciones suman 100 %." },
            { ok: completos === alumnos.length, texto: `Todas las notas están guardadas (${completos} de ${alumnos.length} estudiantes completos).` },
            { ok: completos === alumnos.length && desfasados === 0, texto: "Las notas del periodo guardadas coinciden con la configuración actual." }
        ];
    }

    function trasladar(g, c, p, usuario) {
        const actual = registro(g, c, p);
        if (actual.estado === "trasladado") return { ok: false, motivo: "El periodo ya fue trasladado a Registro." };
        const faltan = requisitosTraslado(g, c, p).filter(r => !r.ok);
        if (faltan.length) return { ok: false, motivo: faltan[0].texto };
        const gr = Datos.grupo(g), ci = Datos.ciclo(c);
        const folio = `REG-${gr.codigo}-S${gr.seccion}-C${ci.corto}-P${p}-${Date.now().toString(36).toUpperCase()}`;
        // Al trasladar, las evaluaciones del periodo quedan finalizadas.
        guardarEvaluaciones(g, c, p, evaluaciones(g, c, p).map(e => ({ ...e, estado: "finalizada" })));
        const nuevo = { estado: "trasladado", folio, fecha: Date.now(), usuario };
        guardar(claves.registro(g, c, p), nuevo);
        return { ok: true, registro: nuevo };
    }
    function solicitarReapertura(g, c, p, motivo, usuario) {
        const r = registro(g, c, p);
        if (r.estado !== "trasladado") return false;
        guardar(claves.registro(g, c, p), { ...r, reapertura: { motivo, fecha: Date.now(), usuario } });
        return true;
    }
    // Solo para la demostración: en producción lo haría Registro Académico.
    function reabrir(g, c, p) { localStorage.removeItem(claves.registro(g, c, p)); }

    /* ---- Datos listos para exportar (siempre desde lo guardado) ---- */
    function filasPeriodo(g, c, p) {
        const evals = evaluaciones(g, c, p);
        const guardadas = notas(g, c, p);
        const cabecera = ["Carné", "Estudiante", ...evals.map(e => `${e.nombre} (${Number(e.porcentaje)}%)`), "Nota del periodo", "Resultado"];
        const cuerpo = Datos.estudiantes(g).map(a => {
            const n = notaPeriodo(evals, guardadas[a.id]);
            return [a.id, a.nombre, ...evals.map(e => esNota(guardadas[a.id]?.[e.id]) ? Number(guardadas[a.id][e.id]) : ""),
                n === null ? "" : redondear(n), n === null ? "Pendiente" : (aprobado(n) ? "Aprobado" : "Reprobado")];
        });
        return { cabecera, cuerpo };
    }
    function filasCiclo(g, c) {
        const guardadas = notasCiclo(g, c);
        const cabecera = ["Carné", "Estudiante", "Periodo 1 (30%)", "Periodo 2 (30%)", "Periodo 3 (40%)", "Nota final del ciclo", "Resultado"];
        const cuerpo = Datos.estudiantes(g).map(a => {
            const r = guardadas[a.id] || {};
            const f = notaFinalCiclo(r.p1, r.p2, r.p3);
            return [a.id, a.nombre, r.p1 ?? "", r.p2 ?? "", r.p3 ?? "", f === null ? "" : redondear(f), f === null ? "Pendiente" : (aprobado(f) ? "Aprobado" : "Reprobado")];
        });
        return { cabecera, cuerpo };
    }

    return {
        ESTADOS_EVALUACION, TOLERANCIA, claves, leer, guardar, redondear, esNota, aprobado,
        evaluaciones, guardarEvaluaciones, totalPorcentaje, sumaCorrecta,
        notas, guardarNotas, notasCiclo, guardarNotasCiclo, notaPeriodo, notaFinalCiclo,
        registro, bloqueado, requisitosTraslado, trasladar, solicitarReapertura, reabrir,
        filasPeriodo, filasCiclo
    };
})();
