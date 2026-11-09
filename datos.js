"use strict";
/* Fuente única de datos de ejemplo del portal: ciclos, periodos, materias,
   grupos/secciones, estudiantes y calendario. Todas las páginas leen de aquí. */
const Datos = (() => {
    const ANIO = 2026;
    const PESO_PERIODO = { 1: 30, 2: 30, 3: 40 };
    const NOTA_MINIMA_POR_DEFECTO = 6.0;

    // Año académico -> 2 ciclos -> 3 periodos (30 % / 30 % / 40 % de la nota del ciclo)
    const CICLOS = [
        { id: "ciclo1-2026", nombre: "Ciclo I - 2026", corto: "I", inicio: "2026-02-02", fin: "2026-06-26",
          periodos: [{ n: 1, inicio: "2026-02-02", fin: "2026-03-13" }, { n: 2, inicio: "2026-03-16", fin: "2026-04-24" }, { n: 3, inicio: "2026-04-27", fin: "2026-06-26" }] },
        { id: "ciclo2-2026", nombre: "Ciclo II - 2026", corto: "II", inicio: "2026-07-20", fin: "2026-11-27",
          periodos: [{ n: 1, inicio: "2026-07-20", fin: "2026-08-28" }, { n: 2, inicio: "2026-08-31", fin: "2026-10-09" }, { n: 3, inicio: "2026-10-12", fin: "2026-11-27" }] }
    ];

    const MATERIAS = [
        { codigo: "PWE", nombre: "Programación Web" },
        { codigo: "BD", nombre: "Bases de Datos" },
        { codigo: "PW2", nombre: "Programación Web II" }
    ];

    // Un "grupo" = materia + sección. Los id se conservan por compatibilidad con datos ya guardados.
    // Total: 28 + 32 + 31 + 35 = 126 estudiantes (cifra que ya mostraba el dashboard).
    const GRUPOS = [
        { id: "pwe", codigo: "PWE-2026", materia: "PWE", seccion: "01", dia: "Lunes", horario: "7:00 AM - 10:00 AM", aula: "Lab. 3", cantidad: 28 },
        { id: "bd", codigo: "BD-2026", materia: "BD", seccion: "01", dia: "Martes", horario: "8:00 AM - 11:00 AM", aula: "Lab. 1", cantidad: 32 },
        { id: "pw2", codigo: "PW2-2026", materia: "PW2", seccion: "01", dia: "Miércoles", horario: "7:00 AM - 10:00 AM", aula: "Lab. 3", cantidad: 31 },
        { id: "bd2", codigo: "BD-2026", materia: "BD", seccion: "02", dia: "Jueves", horario: "1:00 PM - 4:00 PM", aula: "Lab. 2", cantidad: 35 }
    ];

    const EVALUACIONES_BASE = [
        { id: "eval-actividad-i", nombre: "Actividad I", porcentaje: 30, estado: "pendiente" },
        { id: "eval-actividad-ii", nombre: "Actividad II", porcentaje: 30, estado: "pendiente" },
        { id: "eval-parcial", nombre: "Parcial", porcentaje: 40, estado: "pendiente" }
    ];

    const EVENTOS = [
        { fecha: "2026-10-14", hora: "8:00 AM", tipo: "EVALUACIÓN", color: "amarillo", titulo: "Parcial 2", detalle: "Bases de Datos" },
        { fecha: "2026-10-16", hora: "11:59 PM", tipo: "CALIFICACIONES", color: "azul", titulo: "Entrega de calificaciones · Periodo 2", detalle: "Todos los grupos" },
        { fecha: "2026-10-23", hora: "11:59 PM", tipo: "ACTIVIDAD", color: "gris", titulo: "Actividad I", detalle: "Programación Web" },
        { fecha: "2026-11-03", hora: "11:59 PM", tipo: "ACTIVIDAD", color: "gris", titulo: "Actividad II", detalle: "Programación Web II" },
        { fecha: "2026-11-10", hora: "7:00 AM", tipo: "EVALUACIÓN", color: "amarillo", titulo: "Parcial 3", detalle: "Programación Web" },
        { fecha: "2026-11-12", hora: "8:00 AM", tipo: "EVALUACIÓN", color: "amarillo", titulo: "Parcial 3", detalle: "Bases de Datos" },
        { fecha: "2026-11-19", hora: "7:00 AM", tipo: "PROYECTO", color: "azul", titulo: "Proyecto final", detalle: "Programación Web II" },
        { fecha: "2026-11-24", hora: "11:59 PM", tipo: "CALIFICACIONES", color: "azul", titulo: "Entrega de calificaciones · Periodo 3", detalle: "Todos los grupos" },
        { fecha: "2026-11-27", hora: "11:59 PM", tipo: "CIERRE", color: "azul", titulo: "Cierre de ciclo", detalle: "Ciclo II - 2026" }
    ];

    /* ---- Estudiantes (generados de forma determinista para que siempre sean los mismos) ---- */
    const NOMBRES = ["Juan", "María", "Carlos", "Ana", "Luis", "Sofía", "José", "Camila", "Diego", "Valeria", "Miguel", "Daniela", "Andrés", "Gabriela", "Fernando", "Paola", "Ricardo", "Lucía", "Mario", "Karla", "Héctor", "Fátima", "Oscar", "Beatriz", "Rafael", "Mónica", "Pablo", "Alejandra"];
    const APELLIDOS = ["Pérez", "López", "Martínez", "Rodríguez", "Hernández", "García", "Ramírez", "Flores", "Morales", "Castro", "Rivera", "Mejía", "Aguilar", "Cruz", "Ortiz", "Vásquez", "Menjívar", "Guzmán", "Alvarado", "Reyes", "Portillo", "Campos", "Chávez", "Quintanilla", "Rosales", "Navarro", "Cárdenas", "Molina"];
    const FIJOS = ["Juan Pérez", "María López", "Carlos Martínez", "Ana Rodríguez"]; // los 4 de la versión anterior (PWE)

    const cacheEstudiantes = {};
    function generarEstudiantes() {
        let secuencia = 0;
        GRUPOS.forEach((g, gi) => {
            const usados = new Set();
            const lista = [];
            for (let i = 0; i < g.cantidad; i++) {
                secuencia++;
                let nombre;
                if (gi === 0 && i < FIJOS.length) nombre = FIJOS[i];
                else {
                    let a = (i * 3 + gi * 7 + 1) % APELLIDOS.length;
                    const n = NOMBRES[(i * 5 + gi * 3) % NOMBRES.length];
                    nombre = `${n} ${APELLIDOS[a]}`;
                    while (usados.has(nombre)) { a = (a + 1) % APELLIDOS.length; nombre = `${n} ${APELLIDOS[a]}`; }
                }
                usados.add(nombre);
                lista.push({ id: `${ANIO}${String(secuencia).padStart(4, "0")}`, nombre });
            }
            cacheEstudiantes[g.id] = lista;
        });
    }
    generarEstudiantes();

    /* ---- Fechas ---- */
    function fechaISO(d = new Date()) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    function cicloPorFecha(hoy = fechaISO()) {
        return CICLOS.find(c => hoy <= c.fin) || CICLOS[CICLOS.length - 1];
    }
    function periodoPorFecha(ciclo, hoy = fechaISO()) {
        const p = ciclo.periodos.find(x => hoy <= x.fin);
        return p ? p.n : 3;
    }

    /* ---- Ajustes del docente (Configuración) ---- */
    const CLAVE_AJUSTES = "portal_ajustes";
    function ajustes() {
        let guardados = {};
        try { guardados = JSON.parse(localStorage.getItem(CLAVE_AJUSTES)) || {}; } catch (e) { /* ajustes dañados: se usan los valores por defecto */ }
        return { nombre: "", cicloPredeterminado: "auto", notaMinima: NOTA_MINIMA_POR_DEFECTO, ...guardados };
    }
    function guardarAjustes(nuevos) {
        localStorage.setItem(CLAVE_AJUSTES, JSON.stringify({ ...ajustes(), ...nuevos }));
    }

    /* ---- Consultas ---- */
    const ciclos = () => CICLOS;
    const grupos = () => GRUPOS;
    const grupo = id => GRUPOS.find(g => g.id === id) || null;
    const materia = codigo => MATERIAS.find(m => m.codigo === codigo) || null;
    const ciclo = id => CICLOS.find(c => c.id === id) || null;
    const estudiantes = idGrupo => cacheEstudiantes[idGrupo] || [];
    const nombreMateria = g => (materia(g.materia) || { nombre: g.materia }).nombre;
    const etiquetaGrupo = g => `${g.codigo} · Sección ${g.seccion} · ${nombreMateria(g)}`;
    const totalEstudiantes = () => GRUPOS.reduce((t, g) => t + g.cantidad, 0);

    function cicloActual() {
        const a = ajustes().cicloPredeterminado;
        return (a !== "auto" && ciclo(a)) || cicloPorFecha();
    }
    function periodoActual() { return periodoPorFecha(cicloActual()); }

    return {
        ANIO, PESO_PERIODO, NOTA_MINIMA_POR_DEFECTO, EVALUACIONES_BASE, EVENTOS,
        ciclos, grupos, grupo, materia, ciclo, estudiantes, nombreMateria, etiquetaGrupo, totalEstudiantes,
        cicloActual, periodoActual, fechaISO, ajustes, guardarAjustes
    };
})();
