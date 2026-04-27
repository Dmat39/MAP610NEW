const roles = ['ADMINISTRATOR', 'SUPERVISOR', 'CODISEC', 'OPERATOR', 'VIEWER', 'PNP'];

const nombres = [
  'Carlos', 'María', 'Luis', 'Ana', 'Jorge', 'Rosa', 'Miguel', 'Carmen',
  'Pedro', 'Lucía', 'Diego', 'Patricia', 'Andrés', 'Elena', 'Ricardo',
  'Sofía', 'Fernando', 'Isabel', 'Gabriel', 'Valentina', 'Héctor', 'Claudia',
  'Raúl', 'Mónica', 'Óscar', 'Daniela', 'Sergio', 'Natalia', 'Eduardo',
  'Alejandra', 'Javier', 'Paola', 'Roberto', 'Verónica', 'Alejandro',
];

const apellidos = [
  'García', 'Rodríguez', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez',
  'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Cruz', 'Reyes',
  'Morales', 'Ortiz', 'Vargas', 'Romero', 'Herrera', 'Medina', 'Aguilar',
  'Jiménez', 'Mendoza', 'Ramos', 'Castillo', 'Vega', 'Guerrero', 'Quispe',
  'Chávez', 'Mamani', 'Condori', 'Huanca', 'Salinas', 'Villanueva',
];

const dominios = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'muni-sjl.gob.pe'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const usuariosMock = Array.from({ length: 100 }, (_, i) => {
  const nombre = rand(nombres);
  const apellido = rand(apellidos);
  const apellido2 = rand(apellidos);
  const username = `${nombre.toLowerCase()}.${apellido.toLowerCase()}${i + 1}`;
  const email = `${username}@${rand(dominios)}`;
  const dni = String(randInt(10000000, 99999999));
  const phone = `9${String(randInt(10000000, 99999999))}`;
  const rol = rand(roles);

  return {
    id: i + 1,
    name: nombre,
    lastname: `${apellido} ${apellido2}`,
    username,
    email,
    dni,
    phone,
    rol,
  };
});

export default usuariosMock;
