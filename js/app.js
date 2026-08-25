function desplazar(id, desplazamiento) {
    const contenedor = document.getElementById(id);
    if (contenedor) {
        contenedor.scrollBy({ left: desplazamiento, behavior: 'smooth' });
    }
}

function cambiarSeccion(idSeccion, botonPresionado = null) {
    const secciones = document.querySelectorAll('.seccion-menu');
    secciones.forEach(sec => sec.classList.add('d-none'));

    const seccionActiva = document.getElementById(idSeccion);
    if (seccionActiva) {
        seccionActiva.classList.remove('d-none');
    }

    const botones = document.querySelectorAll('.btn-categoria');
    botones.forEach(btn => btn.classList.remove('active'));

    if (botonPresionado) {
        botonPresionado.classList.add('active');
    } else {
        const botonCoincidente = Array.from(botones).find(btn => 
            btn.getAttribute('onclick')?.includes(idSeccion)
        );
        if (botonCoincidente) {
            botonCoincidente.classList.add('active');
        }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('DOMContentLoaded', procesarHash);
window.addEventListener('hashchange', procesarHash);

function procesarHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        cambiarSeccion(hash);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Control de ruta protegida para admin.html
    verificarAccesoAdmin();

    // 2. Sincronizar estado de sesión en la barra de navegación de cualquier página
    actualizarNavbar();

    // --- REGISTRO DE CUENTAS (create.html) ---
    // (Aún usa LocalStorage, lo conectaremos a Node.js en el siguiente paso)
    const formRegistro = document.getElementById("formRegistro");
    if (formRegistro) {
        formRegistro.addEventListener("submit", (e) => {
            e.preventDefault();
            const password = document.getElementById("regPassword").value;
            const confirmPassword = document.getElementById("regPasswordConfirm").value;

            if (password !== confirmPassword) {
                alert("Las contraseñas no coinciden. Por favor verifica.");
                return;
            }
            alert("El registro local está pausado. ¡Pronto lo conectaremos a la Base de Datos!");
        });
    }

    // --- INICIO DE SESIÓN (login.html) --- CONECTADO A NODE.JS
    const formLogin = document.getElementById("formLogin");
    if (formLogin) {
        formLogin.addEventListener("submit", async (e) => { 
            e.preventDefault();

            const email = document.getElementById("loginEmail").value.trim().toLowerCase();
            const password = document.getElementById("loginPassword").value;

            try {
                // Petición real al servidor Node.js
                const respuesta = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const datos = await respuesta.json();

                if (respuesta.ok) {
                    // Guardamos el token de seguridad y los datos de sesión
                    localStorage.setItem('token', datos.token);
                    localStorage.setItem("sesion_activa", JSON.stringify(datos.usuario));

                    // Redirección según rol proveniente de PostgreSQL
                    if (datos.usuario.rol === "ADMIN") {
                        alert(`Bienvenido Administrador: ${datos.usuario.nombre}`);
                        window.location.href = "admin.html";
                    } else {
                        alert(`Bienvenido ${datos.usuario.nombre}`);
                        window.location.href = "index.html";
                    }
                } else {
                    alert(`Error: ${datos.error}`);
                }
            } catch (error) {
                console.error(error);
                alert("Error crítico: No se pudo conectar con el servidor Node.js. ¿Está encendido?");
            }
        });
    }

    // --- ALTERNAR VISIBILIDAD DE CONTRASEÑA ---
    const toggleEye = document.getElementById("toggleEye");
    if (toggleEye) {
        toggleEye.addEventListener("click", () => {
            const passInput = document.getElementById("loginPassword");
            if (passInput.type === "password") {
                passInput.type = "text";
                toggleEye.classList.replace("fa-eye", "fa-eye-slash");
            } else {
                passInput.type = "password";
                toggleEye.classList.replace("fa-eye-slash", "fa-eye");
            }
        });
    }
});

// Proteger ruta de administración
function verificarAccesoAdmin() {
    if (window.location.pathname.includes("admin.html")) {
        const sesion = JSON.parse(localStorage.getItem("sesion_activa"));
        if (!sesion || sesion.rol !== "ADMIN") {
            alert("Acceso no autorizado. Debe iniciar sesión como administrador.");
            window.location.href = "login.html";
        }
    }
}

// Actualizar barra de navegación en todas las páginas según la sesión activa
function actualizarNavbar() {
    const sesion = JSON.parse(localStorage.getItem("sesion_activa"));
    const navUserArea = document.getElementById("navUserArea");
    const navLinkMenu = document.getElementById("navLinkMenu");

    if (!navUserArea) return;

    if (sesion) {
        // 1. Mostrar nombre y botón para cerrar sesión
        const iconoRol = sesion.rol === "ADMIN" ? "fa-user-shield text-warning" : "fa-user-check text-success";
        navUserArea.innerHTML = `
            <div class="d-flex align-items-center gap-2 text-white text-nowrap">
                <i class="fa-solid ${iconoRol}"></i>
                <span>${sesion.nombre}</span>
                <a href="#" onclick="cerrarSesion()" class="text-danger small ms-2 text-decoration-none" title="Cerrar sesión">
                    <i class="fa-solid fa-right-from-bracket"></i> Salir
                </a>
            </div>
        `;

        // 2. Si es admin y no está en admin.html, insertar la pestaña 'Administración'
        if (sesion.rol === "ADMIN" && !window.location.pathname.includes("admin.html")) {
            if (navLinkMenu && !document.getElementById("navAdminLink")) {
                const adminBtn = document.createElement("a");
                adminBtn.id = "navAdminLink";
                adminBtn.className = "nav-link px-3 py-1 fw-bold text-warning text-nowrap";
                adminBtn.href = "admin.html";
                adminBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Administración';
                navLinkMenu.after(adminBtn);
            }
        }
    } else {
        // Si no hay sesión activa, mantener botón de inicio de sesión
        navUserArea.innerHTML = `
            <a class="d-flex align-items-center gap-2 text-white text-nowrap" href="login.html">
                <i class="fa-solid fa-user"></i>
                <span>Iniciar sesión</span>
            </a>
        `;
    }
}

// Cerrar sesión y redireccionar
function cerrarSesion() {
    localStorage.removeItem("sesion_activa");
    localStorage.removeItem("token");
    window.location.href = "login.html";
}