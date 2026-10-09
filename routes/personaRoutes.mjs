
import express from 'express';

import {
  crearPersona,
  obtenerPersonas,
  obtenerPersona,
  actualizarPersona,
  eliminarPersona,
  obtenerFamilia
} from '../controllers/personaController.mjs';

const router = express.Router();

router.post('/', crearPersona);
router.get('/', obtenerPersonas);
router.get('/:id/familia', obtenerFamilia);
router.get('/:id', obtenerPersona);
router.put('/:id', actualizarPersona);
router.patch('/:id', actualizarPersona);
router.delete('/:id', eliminarPersona);

export default router;