document.addEventListener("DOMContentLoaded", () => {
    // 1. Inicializar usuario administrador por defecto si no existe
    inicializarBaseDeDatos();

    // 2. Control de ruta protegida para admin.html
    verificarAccesoAdmin();

    // 3. Sincronizar estado de sesión en la barra de navegación de cualquier página
    actualizarNavbar();

    // --- REGISTRO DE CUENTAS (create.html) ---
    const formRegistro = document.getElementById("formRegistro");
    if (formRegistro) {
        formRegistro.addEventListener("submit", (e) => {
            e.preventDefault();

            const password = document.getElementById("regPassword").value;
            const confirmPassword = document.getElementById("regPasswordConfirm").value;

            // Validación de contraseña
            if (password !== confirmPassword) {
                alert("Las contraseñas no coinciden. Por favor verifica.");
                return;
            }

            const email = document.getElementById("regEmail").value.trim().toLowerCase();
            const nombre = document.getElementById("regNombre").value.trim();
            const apellido = document.getElementById("regApellido").value.trim();

            const usuarios = JSON.parse(localStorage.getItem("usuarios_pizzeria")) || [];

            // Validación de correo duplicado
            const existe = usuarios.some((u) => u.email === email);
            if (existe) {
                alert("Este correo electrónico ya se encuentra registrado.");
                return;
            }

            // Se registra automáticamente con rol CLIENTE
            const nuevoUsuario = {
                nombre,
                apellido,
                email,
                password,
                rol: "cliente"
            };

            usuarios.push(nuevoUsuario);
            localStorage.setItem("usuarios_pizzeria", JSON.stringify(usuarios));

            alert("¡Cuenta registrada con éxito! Ya puedes iniciar sesión.");
            window.location.href = "login.html";
        });
    }

    // --- INICIO DE SESIÓN (login.html) ---
    const formLogin = document.getElementById("formLogin");
    if (formLogin) {
        formLogin.addEventListener("submit", (e) => {
            e.preventDefault();

            const email = document.getElementById("loginEmail").value.trim().toLowerCase();
            const password = document.getElementById("loginPassword").value;

            const usuarios = JSON.parse(localStorage.getItem("usuarios_pizzeria")) || [];

            // Buscar credenciales
            const usuarioValido = usuarios.find(
                (u) => u.email === email && u.password === password
            );

            if (!usuarioValido) {
                alert("Error: El correo o la contraseña son incorrectos, o la cuenta no existe.");
                return;
            }

            // Guardar sesión activa persistente
            localStorage.setItem("sesion_activa", JSON.stringify(usuarioValido));

            // Redirección según rol
            if (usuarioValido.rol === "admin") {
                alert(`Bienvenido Administrador: ${usuarioValido.nombre}`);
                window.location.href = "admin.html";
            } else {
                alert(`Bienvenido ${usuarioValido.nombre}`);
                window.location.href = "index.html";
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

// Semilla de Administrador en memoria
function inicializarBaseDeDatos() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios_pizzeria")) || [];
    const adminExiste = usuarios.some((u) => u.email === "admin@lacaleta.com");

    if (!adminExiste) {
        usuarios.push({
            nombre: "Administrador",
            apellido: "La Caleta",
            email: "admin@lacaleta.com",
            password: "admin",
            rol: "admin"
        });
        localStorage.setItem("usuarios_pizzeria", JSON.stringify(usuarios));
    }
}

// Proteger ruta de administración
function verificarAccesoAdmin() {
    if (window.location.pathname.includes("admin.html")) {
        const sesion = JSON.parse(localStorage.getItem("sesion_activa"));
        if (!sesion || sesion.rol !== "admin") {
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
        const iconoRol = sesion.rol === "admin" ? "fa-user-shield text-warning" : "fa-user-check text-success";
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
        if (sesion.rol === "admin" && !window.location.pathname.includes("admin.html")) {
            if (navLinkMenu && !document.getElementById("navAdminLink")) {
                const adminBtn = document.createElement("a");
                adminBtn.id = "navAdminLink";
                adminBtn.className = "nav-link px-3 py-1 fw-bold text-white text-nowrap";
                adminBtn.href = "admin.html";
                adminBtn.innerText = "Administración";
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

// Desplazamiento horizontal del carrusel en index.html
function desplazar(idContenedor, desplazamiento) {
    const elemento = document.getElementById(idContenedor);
    if (elemento) {
        elemento.scrollBy({ left: desplazamiento, behavior: "smooth" });
    }
}

// Cerrar sesión y redireccionar
function cerrarSesion() {
    localStorage.removeItem("sesion_activa");
    window.location.href = "login.html";
}