"use strict";
const formulario = document.getElementById("formLogin");
const mensaje = document.getElementById("mensaje");

// Credenciales de demostración. En un sistema real la validación se hace en el servidor.
const CREDENCIALES = { usuario: "admin", password: "123456" };

function mostrar(texto, color) {
    mensaje.textContent = texto;
    mensaje.style.color = color;
}

const motivo = new URLSearchParams(window.location.search).get("sesion");
if (motivo === "expirada") mostrar("Tu sesión expiró por inactividad. Ingresa de nuevo.", "#9b7800");
else if (motivo === "cerrada") mostrar("Cerraste sesión correctamente.", "#2e7d32");

if (formulario) {
    formulario.addEventListener("submit", function (e) {
        e.preventDefault();

        const usuario = document.getElementById("usuario").value.trim().toLowerCase();
        const password = document.getElementById("password").value;

        if (usuario === CREDENCIALES.usuario && password === CREDENCIALES.password) {
            Sesion.iniciar(usuario); // se guarda el usuario que escribió la persona
            window.location.href = "dashboard.html";
        } else {
            mostrar("Usuario o contraseña incorrectos.", "#c62828");
        }
    });
}
