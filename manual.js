"use strict";

const Manual = (() => {
    // Reemplaza esta URL con el enlace embed de tu video tutorial en YouTube o Vimeo
    const VIDEO_URL = "https://www.youtube.com/embed/XQmoMkFTDTM";

    const CAPITULOS = [
        { tiempo: 0, titulo: "01. Introducción y Acceso", descripcion: "Cómo iniciar sesión y navegar por la interfaz principal." },
        { tiempo: 45, titulo: "02. Panel Docente (Dashboard)", descripcion: "Resumen de estadísticas, accesos rápidos y avisos." },
        { tiempo: 110, titulo: "03. Mis Grupos y Estudiantes", descripcion: "Consulta de materias asignadas y listas de alumnos." },
        { tiempo: 180, titulo: "04. Configuración de Evaluaciones", descripcion: "Crear y ajustar ponderaciones hasta sumar el 100%." },
        { tiempo: 260, titulo: "05. Registro e Importación (CSV)", descripcion: "Ingreso manual de notas y carga masiva mediante plantilla." },
        { tiempo: 350, titulo: "06. Traslado a Registro Académico", descripcion: "Requisitos de traslado y solicitud de reapertura." },
        { tiempo: 420, titulo: "07. Generación de Actas y PDF", descripcion: "Vista previa, marcas de agua, impresión y exportación." }
    ];

    const PASOS_MANUAL = [
        {
            id: "paso-1",
            titulo: "1. Inicio de sesión y navegación",
            modulo: "Acceso",
            enlace: "index.html",
            textoEnlace: "Ir al Login",
            contenido: "Ingresa con tus credenciales asignadas. Al iniciar sesión serás redirigido al Panel Principal (Dashboard), donde podrás ver el resumen de tus grupos y los periodos activos."
        },
        {
            id: "paso-2",
            titulo: "2. Consulta de grupos académicos",
            modulo: "Mis Grupos",
            enlace: "grupos.html",
            textoEnlace: "Ver mis grupos",
            contenido: "En la sección «Mis grupos» puedes consultar las asignaturas que tienes a cargo durante el ciclo, revisar la cantidad de estudiantes inscritos y acceder alos accesos directos de calificaciones."
        },
        {
            id: "paso-3",
            titulo: "3. Configuración de evaluaciones",
            modulo: "Evaluaciones",
            enlace: "evaluaciones.html",
            textoEnlace: "Administrar evaluaciones",
            contenido: "Define los porcentajes de cada evaluación dentro del periodo. Recuerda que la suma total debe ser exactamente el 100% para poder registrar y trasladar las calificaciones correctamente."
        },
        {
            id: "paso-4",
            titulo: "4. Ingreso e importación masiva de notas",
            modulo: "Calificaciones",
            enlace: "calificaciones.html",
            textoEnlace: "Ir a Calificaciones",
            contenido: "Puedes ingresar la nota de cada estudiante individualmente o hacer clic en «Subir notas (CSV)» para cargar la plantilla completa desde Excel. El sistema validará los formatos automáticamente."
        },
        {
            id: "paso-5",
            titulo: "5. Traslado a Registro Académico",
            modulo: "Registro",
            enlace: "calificaciones.html#panelRegistro",
            textoEnlace: "Ver traslado a registro",
            contenido: "Una vez completadas y guardadas las notas del periodo, realiza el traslado oficial a Registro Académico. Al trasladarlo, las calificaciones quedarán bloqueadas para evitar modificaciones."
        },
        {
            id: "paso-6",
            titulo: "6. Impresión y exportación de actas",
            modulo: "Actas y Registros",
            enlace: "actas.html",
            textoEnlace: "Generar actas",
            contenido: "Genera el acta oficial de calificaciones o el registro del ciclo completo. Puedes imprimirla directamente, guardarla en PDF o exportarla a Excel en formato CSV."
        }
    ];

    function obtenerProgreso() {
        try {
            return JSON.parse(localStorage.getItem("portal_manual_progreso")) || {};
        } catch (e) {
            return {};
        }
    }

    function guardarProgreso(progreso) {
        localStorage.setItem("portal_manual_progreso", JSON.stringify(progreso));
    }

    function dibujarVideo() {
        const contenedor = document.getElementById("videoContenedor");
        if (!contenedor) return;

        contenedor.innerHTML = "";
        const iframe = Ui.el("iframe", {
            src: VIDEO_URL,
            title: "Video tutorial del Portal Docente",
            frameborder: "0",
            allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
            allowfullscreen: "true",
            style: "width: 100%; height: 100%; min-height: 315px; border-radius: 8px;"
        });
        contenedor.appendChild(iframe);

        const listaCapitulos = document.getElementById("listaCapitulos");
        if (!listaCapitulos) return;

        listaCapitulos.innerHTML = "";
        CAPITULOS.forEach(cap => {
            const item = Ui.el("li", { class: "item-capitulo" },
                Ui.el("button", {
                    type: "button",
                    class: "btn-capitulo",
                    onclick: () => {
                        const urlConTiempo = `${VIDEO_URL}?start=${cap.tiempo}&autoplay=1`;
                        iframe.setAttribute("src", urlConTiempo);
                    }
                },
                    Ui.el("strong", { texto: cap.titulo }),
                    Ui.el("p", { texto: cap.descripcion })
                )
            );
            listaCapitulos.appendChild(item);
        });
    }

    function dibujarManual() {
        const contenedor = document.getElementById("listaManual");
        if (!contenedor) return;

        const progreso = obtenerProgreso();
        contenedor.innerHTML = "";

        PASOS_MANUAL.forEach(paso => {
            const completado = !!progreso[paso.id];

            const tarjeta = Ui.el("article", { class: `paso-manual ${completado ? "completado" : ""}` },
                Ui.el("div", { class: "paso-header" },
                    Ui.el("div", {},
                        Ui.el("span", { class: "chip", texto: paso.modulo }),
                        Ui.el("h3", { texto: paso.titulo })
                    ),
                    Ui.el("label", { class: "check-completado" },
                        Ui.el("input", {
                            type: "checkbox",
                            checked: completado,
                            onchange: (ev) => {
                                progreso[paso.id] = ev.target.checked;
                                guardarProgreso(progreso);
                                dibujarManual();
                            }
                        }),
                        " Completado"
                    )
                ),
                Ui.el("p", { class: "paso-contenido", texto: paso.contenido }),
                Ui.el("div", { class: "paso-acciones" },
                    Ui.el("a", { class: "btn primario", href: paso.enlace },
                        Ui.el("i", { "data-lucide": "external-link" }),
                        paso.textoEnlace
                    )
                )
            );

            contenedor.appendChild(tarjeta);
        });

        actualizarProgreso(progreso);
        Ui.iconos();
    }

    function actualizarProgreso(progreso) {
        const total = PASOS_MANUAL.length;
        const completados = Object.values(progreso).filter(Boolean).length;
        const porcentaje = Math.round((completados / total) * 100);

        const textoChip = document.getElementById("progresoManual");
        const barra = document.getElementById("barraProgreso");

        if (textoChip) textoChip.textContent = `${completados} de ${total} (${porcentaje}%)`;
        if (barra) barra.style.width = `${porcentaje}%`;
    }

    function iniciar() {
        dibujarVideo();
        dibujarManual();
    }

    return { iniciar };
})();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", Manual.iniciar);
} else {
    Manual.iniciar();
}