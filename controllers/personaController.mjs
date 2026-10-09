
import mongoose from 'mongoose';
import Persona from '../models/Persona.mjs';

const esIdValido = (id) => mongoose.isValidObjectId(id);

// ==================================================
// 1. CREAR PERSONA
// POST /api/personas
// ==================================================
export async function crearPersona(req, res) {
  try {
    const {
      nombres,
      apellidos,
      padre,
      madre
    } = req.body;

    if (!nombres || !apellidos) {
      return res.status(400).json({
        mensaje: 'Los nombres y apellidos son obligatorios'
      });
    }

    // Validar los identificadores de los padres
    for (const id of [padre, madre]) {
      if (id && !esIdValido(id)) {
        return res.status(400).json({
          mensaje: 'El ID del padre o la madre no es válido'
        });
      }
    }

    if (padre && madre && padre === madre) {
      return res.status(400).json({
        mensaje: 'El padre y la madre deben ser personas diferentes'
      });
    }

    // Comprobar que los padres existan
    for (const id of [padre, madre].filter(Boolean)) {
      const existe = await Persona.exists({ _id: id });

      if (!existe) {
        return res.status(400).json({
          mensaje: `No existe la persona relacionada: ${id}`
        });
      }
    }

    const persona = await Persona.create(req.body);

    return res.status(201).json({
      mensaje: 'Persona creada correctamente',
      persona
    });
  } catch (error) {
    return res.status(400).json({
      mensaje: 'No se pudo crear la persona',
      error: error.message
    });
  }
}

// ==================================================
// 2. LISTAR TODAS LAS PERSONAS
// GET /api/personas
// ==================================================
export async function obtenerPersonas(req, res) {
  try {
    const personas = await Persona.find()
      .populate('padre', 'nombres apellidos')
      .populate('madre', 'nombres apellidos')
      .sort({ apellidos: 1, nombres: 1 });

    return res.status(200).json({
      total: personas.length,
      personas
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: 'Error al consultar las personas',
      error: error.message
    });
  }
}

// ==================================================
// 3. CONSULTAR UNA PERSONA POR ID
// GET /api/personas/:id
// ==================================================
export async function obtenerPersona(req, res) {
  try {
    const { id } = req.params;

    if (!esIdValido(id)) {
      return res.status(400).json({
        mensaje: 'El ID proporcionado no es válido'
      });
    }

    const persona = await Persona.findById(id)
      .populate('padre', 'nombres apellidos fechaNacimiento')
      .populate('madre', 'nombres apellidos fechaNacimiento');

    if (!persona) {
      return res.status(404).json({
        mensaje: 'Persona no encontrada'
      });
    }

    return res.status(200).json(persona);
  } catch (error) {
    return res.status(500).json({
      mensaje: 'Error al consultar la persona',
      error: error.message
    });
  }
}

// ==================================================
// 4. ACTUALIZAR UNA PERSONA
// PUT/PATCH /api/personas/:id
// ==================================================
export async function actualizarPersona(req, res) {
  try {
    const { id } = req.params;

    if (!esIdValido(id)) {
      return res.status(400).json({
        mensaje: 'El ID proporcionado no es válido'
      });
    }

    const personaActual = await Persona.findById(id);

    if (!personaActual) {
      return res.status(404).json({
        mensaje: 'Persona no encontrada'
      });
    }

    const camposPermitidos = [
      'nombres',
      'apellidos',
      'fechaNacimiento',
      'sexo',
      'padre',
      'madre'
    ];

    const datos = {};

    for (const campo of camposPermitidos) {
      if (Object.hasOwn(req.body, campo)) {
        datos[campo] = req.body[campo];
      }
    }

    if (
      Object.hasOwn(datos, 'nombres') &&
      !String(datos.nombres).trim()
    ) {
      return res.status(400).json({
        mensaje: 'Los nombres no pueden estar vacíos'
      });
    }

    if (
      Object.hasOwn(datos, 'apellidos') &&
      !String(datos.apellidos).trim()
    ) {
      return res.status(400).json({
        mensaje: 'Los apellidos no pueden estar vacíos'
      });
    }

    // Validar las referencias familiares
    for (const campo of ['padre', 'madre']) {
      if (datos[campo] === '') {
        datos[campo] = null;
      }

      const relacionado = datos[campo];

      if (relacionado && !esIdValido(relacionado)) {
        return res.status(400).json({
          mensaje: `El ID de ${campo} no es válido`
        });
      }

      if (relacionado) {
        if (relacionado === id) {
          return res.status(400).json({
            mensaje: 'Una persona no puede ser su propio padre o madre'
          });
        }

        const existe = await Persona.exists({
          _id: relacionado
        });

        if (!existe) {
          return res.status(400).json({
            mensaje: `No existe la persona relacionada: ${relacionado}`
          });
        }
      }
    }

    const padreFinal = Object.hasOwn(datos, 'padre')
      ? datos.padre
      : personaActual.padre?.toString();

    const madreFinal = Object.hasOwn(datos, 'madre')
      ? datos.madre
      : personaActual.madre?.toString();

    if (padreFinal && madreFinal && padreFinal === madreFinal) {
      return res.status(400).json({
        mensaje: 'El padre y la madre deben ser personas diferentes'
      });
    }

    // Evitar ciclos en el árbol genealógico.
    // Ningún antepasado puede convertirse en hijo de su descendiente.
    const padreNuevo = Object.hasOwn(datos, 'padre')
      ? datos.padre
      : personaActual.padre;

    const madreNueva = Object.hasOwn(datos, 'madre')
      ? datos.madre
      : personaActual.madre;

    const pila = [padreNuevo, madreNueva].filter(Boolean).map(
      familiar => familiar.toString()
    );

    const visitados = new Set();

    while (pila.length > 0) {
      const familiarId = pila.pop();

      if (familiarId === id) {
        return res.status(400).json({
          mensaje: 'Esta relación crearía un ciclo en el árbol genealógico'
        });
      }

      if (visitados.has(familiarId)) {
        continue;
      }

      visitados.add(familiarId);

      const familiar = await Persona.findById(familiarId)
        .select('padre madre');

      if (familiar) {
        if (familiar.padre) {
          pila.push(familiar.padre.toString());
        }

        if (familiar.madre) {
          pila.push(familiar.madre.toString());
        }
      }
    }

    // Aplicar cambios y ejecutar validaciones del modelo
    Object.assign(personaActual, datos);

    await personaActual.save();

    const personaActualizada = await Persona.findById(id)
      .populate('padre', 'nombres apellidos')
      .populate('madre', 'nombres apellidos');

    return res.status(200).json({
      mensaje: 'Persona actualizada correctamente',
      persona: personaActualizada
    });
  } catch (error) {
    return res.status(400).json({
      mensaje: 'No se pudo actualizar la persona',
      error: error.message
    });
  }
}

// ==================================================
// 5. ELIMINAR UNA PERSONA
// DELETE /api/personas/:id
// ==================================================
export async function eliminarPersona(req, res) {
  try {
    const { id } = req.params;

    if (!esIdValido(id)) {
      return res.status(400).json({
        mensaje: 'El ID proporcionado no es válido'
      });
    }

    const persona = await Persona.findById(id);

    if (!persona) {
      return res.status(404).json({
        mensaje: 'Persona no encontrada'
      });
    }

    // No eliminar personas que tengan hijos registrados
    const tieneHijos = await Persona.exists({
      $or: [
        { padre: id },
        { madre: id }
      ]
    });

    if (tieneHijos) {
      return res.status(409).json({
        mensaje:
          'No se puede eliminar esta persona porque tiene hijos registrados. Actualiza primero las relaciones familiares.'
      });
    }

    await persona.deleteOne();

    return res.status(200).json({
      mensaje: 'Persona eliminada correctamente'
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: 'Error al eliminar la persona',
      error: error.message
    });
  }
}

// ==================================================
// 6. CONSULTAR FAMILIA HASTA SEGUNDO GRADO
// GET /api/personas/:id/familia
// ==================================================
export async function obtenerFamilia(req, res) {
  try {
    const { id } = req.params;

    if (!esIdValido(id)) {
      return res.status(400).json({
        mensaje: 'El ID proporcionado no es válido'
      });
    }

    const persona = await Persona.findById(id);

    if (!persona) {
      return res.status(404).json({
        mensaje: 'Persona no encontrada'
      });
    }

    // Primer grado: padres e hijos.
    const idsPadres = [
      persona.padre,
      persona.madre
    ].filter(Boolean);

    const padres = await Persona.find({
      _id: { $in: idsPadres }
    });

    const hijos = await Persona.find({
      $or: [
        { padre: persona._id },
        { madre: persona._id }
      ]
    });

    // Segundo grado: hermanos.
    let hermanos = [];

    if (idsPadres.length > 0) {
      hermanos = await Persona.find({
        _id: { $ne: persona._id },
        $or: [
          { padre: { $in: idsPadres } },
          { madre: { $in: idsPadres } }
        ]
      });
    }

    // Segundo grado: abuelos.
    const idsAbuelos = [
      ...new Set(
        padres
          .flatMap(p => [p.padre, p.madre])
          .filter(Boolean)
          .map(familiar => familiar.toString())
      )
    ];

    const abuelos = idsAbuelos.length > 0
      ? await Persona.find({
          _id: { $in: idsAbuelos }
        })
      : [];

    // Segundo grado: nietos.
    const idsHijos = hijos.map(hijo => hijo._id);

    const nietos = idsHijos.length > 0
      ? await Persona.find({
          $or: [
            { padre: { $in: idsHijos } },
            { madre: { $in: idsHijos } }
          ]
        })
      : [];

    return res.status(200).json({
      persona,
      primerGrado: {
        padres,
        hijos
      },
      segundoGrado: {
        hermanos,
        abuelos,
        nietos
      }
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: 'Error al consultar las relaciones familiares',
      error: error.message
    });
  }
}