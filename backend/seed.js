const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando la siembra de datos...');

    // 1. Crear los Roles
    const rolCliente = await prisma.rol.create({
        data: { nombre: 'CLIENTE', descripcion: 'Comprador regular de la web' }
    });
    
    const rolAdmin = await prisma.rol.create({
        data: { nombre: 'ADMIN', descripcion: 'Dueño y administrador del sistema' }
    });

    console.log('✅ Roles creados exitosamente.');

    // 2. Crear tu cuenta de Administrador Maestro
    // Usamos bcrypt para encriptar la contraseña "admin123"
    const passwordSegura = await bcrypt.hash('admin123', 10);

    await prisma.usuario.create({
        data: {
            email: 'admin@lacaleta.com',
            passwordHash: passwordSegura,
            nombre: 'Guillermo Admin',
            telefono: '999999999',
            rolId: rolAdmin.id // Le asignamos dinámicamente el id del rol ADMIN
        }
    });

    console.log('✅ Usuario Administrador creado exitosamente.');
}

main()
    .catch((e) => {
        console.error('Error durante la siembra:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
