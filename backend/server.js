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
        console.error(error);
        res.status(500).json({ error: "Error interno del servidor." });
    }
});

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🍕 Servidor de 'Come Caleta' corriendo en el puerto ${PORT}`);
});