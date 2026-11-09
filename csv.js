"use strict";
/* Lectura y escritura de CSV (compatible con Excel en español: ; o , como separador, decimales con coma). */
const Csv = (() => {
    function normalizar(texto) {
        return String(texto ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .toLowerCase().replace(/\s+/g, " ").trim();
    }

    function detectarDelimitador(texto) {
        const primera = texto.split(/\r?\n/).find(l => l.trim() !== "") || "";
        let mejor = ",", max = 0;
        [",", ";", "\t"].forEach(d => {
            let n = 0, comillas = false;
            for (const c of primera) { if (c === '"') comillas = !comillas; else if (c === d && !comillas) n++; }
            if (n > max) { max = n; mejor = d; }
        });
        return mejor;
    }

    function parsear(texto) {
        texto = texto.replace(/^\ufeff/, "");
        const delimitador = detectarDelimitador(texto);
        const filas = [];
        let fila = [], celda = "", comillas = false;
        for (let i = 0; i < texto.length; i++) {
            const c = texto[i];
            if (comillas) {
                if (c === '"' && texto[i + 1] === '"') { celda += '"'; i++; }
                else if (c === '"') comillas = false;
                else celda += c;
            } else if (c === '"') comillas = true;
            else if (c === delimitador) { fila.push(celda); celda = ""; }
            else if (c === "\n" || c === "\r") {
                if (c === "\r" && texto[i + 1] === "\n") i++;
                fila.push(celda); celda = "";
                filas.push(fila); fila = [];
            } else celda += c;
        }
        if (celda !== "" || fila.length) { fila.push(celda); filas.push(fila); }
        // se conserva el número de línea original de cada fila (para mensajes de error)
        return { delimitador, filas: filas.map((f, i) => ({ linea: i + 1, celdas: f.map(x => x.trim()) })).filter(f => f.celdas.some(x => x !== "")) };
    }

    // Evita que Excel interprete texto como fórmula (=, +, -, @) al abrir el archivo exportado.
    function celdaSegura(valor) {
        if (valor === null || valor === undefined) return "";
        if (typeof valor === "number") return String(valor);
        const texto = String(valor);
        return /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
    }
    function generar(filas, delimitador = ",") {
        const escapar = v => {
            const t = celdaSegura(v);
            return /[",;\t\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
        };
        return filas.map(f => f.map(escapar).join(delimitador)).join("\r\n");
    }
    function descargar(nombreArchivo, filas, delimitador = ",") {
        const blob = new Blob(["\ufeff" + generar(filas, delimitador)], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = nombreArchivo;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    // UTF-8 y, si falla, Windows-1252 (lo que guarda Excel como "CSV" en Windows).
    async function leerArchivo(archivo) {
        const buffer = await archivo.arrayBuffer();
        try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
        catch (e) { return new TextDecoder("windows-1252").decode(buffer); }
    }

    function numero(texto) {
        const t = String(texto).trim().replace(",", ".");
        if (!/^-?\d+(\.\d+)?$/.test(t)) return NaN;
        return Number(t);
    }

    function nombreSeguro(texto) {
        return normalizar(texto).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    return { normalizar, parsear, generar, descargar, leerArchivo, numero, nombreSeguro };
})();
