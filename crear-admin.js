const { initPool, execute, closePool } = require('./src/db');
require('dotenv').config();

async function crearAdmin() {
  console.log('Iniciando script para crear administrador...');
  try {
    await initPool();

    const nombre = 'admin';
    const correo = 'admin@catering.com';
    const contrasena = 'admin123'; // ¡Esta será la contraseña guardada directamente!
    const telefono = '000000000';
    const rol = 'admin';

    console.log(`Intentando crear usuario admin con correo: ${correo}`);

    // Corregido: Se inserta en la columna CONTRASENA, sin hash ni salt.
    await execute(
      `INSERT INTO USUARIO (NOMBRE_USUARIO, CORREO, CONTRASENA, TELEFONO, ROL)
       VALUES (:nombre, :correo, :contrasena, :telefono, :rol)`,
      { nombre, correo, contrasena, telefono, rol },
      { autoCommit: true }
    );

    console.log('\n**************************************************');
    console.log('¡Usuario administrador creado con éxito!\n');
    console.log('Puedes iniciar sesión con las siguientes credenciales:');
    console.log(`  Correo:     ${correo}`);
    console.log(`  Contraseña: ${contrasena}`);
    console.log('\nNOTA DE SEGURIDAD: La contraseña se ha guardado sin encriptar.');
    console.log('Se recomienda actualizar el sistema para usar hashing.');
    console.log('**************************************************\n');

  } catch (err) {
    if (err.errorNum === 1) { // Error de restricción única (ORA-00001)
        console.error('\nError: El usuario administrador (admin@catering.com) ya existe en la base de datos.');
        console.error('No se ha realizado ninguna acción. Puedes iniciar sesión con las credenciales existentes.');
    } else {
        console.error('\nError al crear el usuario administrador:', err);
    }
  } finally {
    if (closePool) {
      await closePool();
      console.log('\nConexión a la base de datos cerrada.');
    }
  }
}

crearAdmin();
