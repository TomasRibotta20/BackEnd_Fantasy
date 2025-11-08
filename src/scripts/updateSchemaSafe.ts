import { orm } from '../shared/db/orm.js'

async function updateSchema() {
  try {
    console.log('Actualizando schema (modo seguro, sin borrar datos)...')
    
    const generator = orm.schema
    await generator.updateSchema()
    
    console.log('Schema actualizado.')
  } catch (error) {
    console.error('Error al actualizar schema:', error)
    throw error
  } finally {
    await orm.close()
  }
}

updateSchema()