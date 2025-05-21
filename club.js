// Prototipo de Club
const Club = {
  init(id, nombre) {
    this.id = id;
    this.nombre = nombre;

    this.getInfo = function () {
      return (`ID: ${this.id}, Club: ${this.nombre}`);
    };
  }
};

// Lista de clubes
const clubes = [];

// ID autoincremental
let nextId = 1;

// Crear club
function crearClub(nombre) {
  const nuevoClub = Object.create(Club);
  nuevoClub.init(nextId++, nombre);
  clubes.push(nuevoClub);
  return nuevoClub;
}

// Leer todos los clubes
function obtenerClubes() {
  return clubes;
}

// Buscar club por ID
function obtenerClubPorId(id) {
  return clubes.find(club => club.id === id) || null;
}

// Actualizar club por ID
function actualizarClubPorId(id, nuevoNombre) {
  const club = obtenerClubPorId(id);
  if (club) {
    club.nombre = nuevoNombre;
    return true;
  }
  return false;
}

// Eliminar club por ID
function eliminarClubPorId(id) {
  const index = clubes.findIndex(club => club.id === id);
  if (index !== -1) {
    clubes.splice(index, 1);
    return true;
  }
  return false;
}

// Ejemplo de uso
const c1 = crearClub("Rosario Central");
const c2 = crearClub("River");
const c3 = crearClub("San Lorenz");

console.log("Todos los clubes:");
obtenerClubes().forEach(c => console.log(c.getInfo()));

console.log("Buscar club con ID 2:");
console.log(obtenerClubPorId(2)?.getInfo());

console.log("Actualizar club con ID 3:");
actualizarClubPorId(3, "San Lorenzo");
console.log(obtenerClubPorId(3)?.getInfo());

console.log("Eliminar club con ID 1:");
eliminarClubPorId(1);
obtenerClubes().forEach(c => console.log(c.getInfo()));