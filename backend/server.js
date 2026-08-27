const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// ==========================================
// MIDDLEWARE: VERIFICAR TOKEN
// ==========================================
const middlewareVerificarToken = (req, res, next) => {
    // 1. El cliente debe enviar el token en los "Headers" bajo "Authorization"
    // Normalmente viene en el formato: "Bearer eyJhbGciOi..."
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 

    // 2. Si el guardia no ve el token, niega el acceso
    if (!token) {
        return res.status(401).json({ error: "Acceso denegado. No hay token de sesión." });
    }

    try {
        // 3. El guardia verifica si la firma del token es válida usando tu secreto del .env
        const decodificado = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Si es válido, extrae el ID del usuario y lo adjunta a la petición
        req.usuarioId = decodificado.id;
        
        // 5. ¡Abre la puerta! Permite que la petición continúe a la ruta final
        next(); 
    } catch (error) {
        return res.status(403).json({ error: "Token inválido o expirado." });
    }
};

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Buscamos si el usuario existe en la BD
        const usuario = await prisma.usuario.findUnique({
            where: { email: email },
            include: { rol: true } // Traemos también la información de su rol
        });

        if (!usuario) {
            return res.status(401).json({ error: "Credenciales incorrectas." });
        }

        // 2. Comparamos la contraseña enviada con la encriptada en la BD
        const passwordValida = await bcrypt.compare(password, usuario.passwordHash);

        if (!passwordValida) {
            return res.status(401).json({ error: "Credenciales incorrectas." });
        }

        // 3. Generamos el "Pase VIP" (Token JWT)
        // Guardamos su ID y su Rol dentro del token
        const token = jwt.sign(
            { id: usuario.id, rolId: usuario.rolId, rolNombre: usuario.rol.nombre },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // El token expira en 8 horas
        );

        // 4. Respondemos al frontend con el token y datos básicos
        res.json({
            mensaje: "¡Login exitoso!",
            token: token,
            usuario: {
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol.nombre // Aquí tu frontend sabrá si es "ADMIN" o "CLIENTE"
            }
        });

    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// ==========================================
// RUTA DE REGISTRO DE CLIENTES
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, apellido, email, password, telefono } = req.body;

        // 1. Verificar si el correo ya está registrado en la base de datos
        const usuarioExistente = await prisma.usuario.findUnique({
            where: { email: email }
        });

        if (usuarioExistente) {
            return res.status(400).json({ error: "Este correo electrónico ya se encuentra registrado." });
        }

        // 2. Buscar automáticamente el ID del rol "CLIENTE" en la tabla roles
        const rolCliente = await prisma.rol.findFirst({
            where: { nombre: { equals: 'CLIENTE', mode: 'insensitive' } } // Búsqueda insensible a mayúsculas
        });

        if (!rolCliente) {
            return res.status(500).json({ error: "Error de configuración: El rol CLIENTE no existe en la base de datos." });
        }

        // 3. Encriptar la contraseña de forma segura con bcrypt
        const passwordHash = await bcrypt.hash(password, 10);

        // 4. Crear el nuevo usuario en PostgreSQL vinculándolo al rol CLIENTE
        const nuevoUsuario = await prisma.usuario.create({
            data: {
                email: email,
                passwordHash: passwordHash,
                nombre: `${nombre} ${apellido}`.trim(), // Unimos nombre y apellido para ajustarse al modelo
                telefono: telefono || null,
                rolId: rolCliente.id
            }
        });

        // 5. Responder con éxito al frontend
        res.status(201).json({
            mensaje: "¡Cuenta registrada con éxito en la base de datos!",
            usuario: {
                id: nuevoUsuario.id,
                nombre: nuevoUsuario.nombre,
                email: nuevoUsuario.email
            }
        });

    } catch (error) {
        console.error("Error en el registro:", error);
        res.status(500).json({ error: "Error interno del servidor al registrar la cuenta." });
    }
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🍕 Servidor de 'Come Caleta' corriendo en el puerto ${PORT}`);
});

// Ruta para añadir un producto al carrito
app.post('/api/carrito/add', middlewareVerificarToken,  async (req, res) => {
    // Nota: El middleware debería añadir req.usuarioId a partir del JWT
    const usuarioId = req.usuarioId; // Asume que tienes el ID del usuario logueado
    const { productoVarianteId, cantidad } = req.body;

    try {
        // 1. Buscar si el usuario ya tiene un carrito (Orden 'Pendiente')
        let carrito = await prisma.orden.findFirst({
            where: { usuarioId: usuarioId, estado: 'Pendiente' }
        });

        // 2. Si no tiene carrito, se lo creamos (necesitarás manejar la dirección por defecto)
        if (!carrito) {
            // Buscamos una dirección del usuario (simplificado)
            const direccion = await prisma.direccion.findFirst({ where: { usuarioId } });
            if(!direccion) {
                 return res.status(400).json({ error: "El usuario no tiene dirección configurada." });
            }

            carrito = await prisma.orden.create({
                data: {
                    usuarioId: usuarioId,
                    direccionId: direccion.id,
                    estado: 'Pendiente',
                    total: 0 // El total se recalcula luego
                }
            });
        }

        // 3. Buscar el precio de la variante
        const variante = await prisma.productoVariante.findUnique({
            where: { id: productoVarianteId }
        });

        if (!variante) return res.status(404).json({ error: "Variante no encontrada." });

        // 4. Buscar si el producto ya está en el detalle de esta orden
        const detalleExistente = await prisma.detalleOrden.findFirst({
            where: { ordenId: carrito.id, varianteId: productoVarianteId }
        });

        if (detalleExistente) {
             // Actualizar cantidad y subtotal
             await prisma.detalleOrden.update({
                 where: { id: detalleExistente.id },
                 data: {
                     cantidad: detalleExistente.cantidad + cantidad,
                     subtotal: (detalleExistente.cantidad + cantidad) * variante.precio
                 }
             });
        } else {
            // Añadir nuevo detalle
            await prisma.detalleOrden.create({
                data: {
                    ordenId: carrito.id,
                    varianteId: productoVarianteId,
                    cantidad: cantidad,
                    precioUnitario: variante.precio,
                    subtotal: variante.precio * cantidad
                }
            });
        }

        // 5. Recalcular el Total de la Orden sumando los subtotales
        const detalles = await prisma.detalleOrden.findMany({
            where: { ordenId: carrito.id }
        });

        const nuevoTotal = detalles.reduce((acc, detalle) => acc + Number(detalle.subtotal), 0);

        await prisma.orden.update({
            where: { id: carrito.id },
            data: { total: nuevoTotal }
        });

        res.json({ mensaje: "Producto añadido al carrito correctamente." });

    } catch (error) {
        console.error("Error al añadir al carrito:", error);
        res.status(500).json({ error: "Error al añadir al carrito." });
    }
});