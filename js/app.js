function desplazar(id, desplazamiento) {
    const contenedor = document.getElementById(id);
    if (contenedor) {
        contenedor.scrollBy({
            left: desplazamiento,
            behavior: 'smooth'
        });
    }
}

function cambiarSeccion(idSeccion, botonPresionado = null) {
    // 1. Ocultar todas las secciones
    const secciones = document.querySelectorAll('.seccion-menu');
    secciones.forEach(sec => sec.classList.add('d-none'));

    // 2. Mostrar la sección elegida
    const seccionActiva = document.getElementById(idSeccion);
    if (seccionActiva) {
        seccionActiva.classList.remove('d-none');
    }

    // 3. Sincronizar el botón activo de la barra pegajosa superior
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

    // 4. Subir la vista al inicio del menú suavemente
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Escuchar cambios de hash (tanto al cargar como al hacer clic en enlaces con hash)
window.addEventListener('DOMContentLoaded', procesarHash);
window.addEventListener('hashchange', procesarHash);

function procesarHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        cambiarSeccion(hash);
    }
}
