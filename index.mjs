import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import 'dotenv/config';

import Persona from './models/Persona.mjs';
import personaRoutes from './routes/personaRoutes.mjs';

import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger.mjs';

// Configuración de rutas del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

// Configurar EJS y archivos estáticos
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

// Leer datos enviados desde formularios y peticiones JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Documentación interactiva de Swagger
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument)
); 

// Página principal
app.get('/', (req, res) => {
  res.render('inicio');
});

// Listar personas
app.get('/personas', async (req, res) => {
  try {
    const personas = await Persona.find()
      .populate('padre', 'nombres apellidos')
      .populate('madre', 'nombres apellidos')
      .sort({ apellidos: 1, nombres: 1 });

    res.render('personas', { personas });
  } catch (error) {
    console.error('Error al listar personas:', error);
    res.status(500).send('Error al cargar las personas.');
  }
});

// Mostrar formulario para crear una persona
app.get('/personas/nueva', async (req, res) => {
  try {
    const personas = await Persona.find().sort({
      apellidos: 1,
      nombres: 1
    });

    res.render('formulario', {
      persona: null,
      personas,
      error: null
    });
  } catch (error) {
    console.error('Error al cargar el formulario:', error);
    res.status(500).send('Error al cargar el formulario.');
  }
});

// Crear una persona
app.post('/personas', async (req, res) => {
  try {
    const {
      nombres,
      apellidos,
      fechaNacimiento,
      sexo,
      padre,
      madre
    } = req.body;

    await Persona.create({
      nombres,
      apellidos,
      fechaNacimiento: fechaNacimiento || null,
      sexo: sexo || 'otro',
      padre: padre || null,
      madre: madre || null
    });

    res.redirect('/personas');
  } catch (error) {
    console.error('Error al crear persona:', error);

    try {
      const personas = await Persona.find().sort({
        apellidos: 1,
        nombres: 1
      });

      res.status(400).render('formulario', {
        persona: req.body,
        personas,
        error: 'No se pudo registrar la persona. Verifica los datos.'
      });
    } catch (renderError) {
      console.error('Error al volver a mostrar el formulario:', renderError);
      res.status(500).send('Error al registrar la persona.');
    }
  }
});

// Mostrar formulario para editar una persona
app.get('/personas/:id/editar', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send('El identificador de la persona no es válido.');
    }

    const persona = await Persona.findById(req.params.id);

    if (!persona) {
      return res.status(404).send('Persona no encontrada.');
    }

    const personas = await Persona.find({
      _id: { $ne: persona._id }
    }).sort({ apellidos: 1, nombres: 1 });

    res.render('formulario', {
      persona,
      personas,
      error: null
    });
  } catch (error) {
    console.error('Error al cargar persona para editar:', error);
    res.status(500).send('Error al cargar el formulario de edición.');
  }
});

// Actualizar una persona
app.post('/personas/:id/editar', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send('El identificador de la persona no es válido.');
    }

    const {
      nombres,
      apellidos,
      fechaNacimiento,
      sexo,
      padre,
      madre
    } = req.body;

    // Evitar que una persona se asigne a sí misma como padre o madre
    if (
      padre === req.params.id ||
      madre === req.params.id
    ) {
      const persona = await Persona.findById(req.params.id);
      const personas = await Persona.find({
        _id: { $ne: req.params.id }
      });

      return res.status(400).render('formulario', {
        persona: { ...req.body, _id: req.params.id },
        personas,
        error: 'Una persona no puede ser su propio padre o madre.'
      });
    }

    const personaActualizada = await Persona.findByIdAndUpdate(
      req.params.id,
      {
        nombres,
        apellidos,
        fechaNacimiento: fechaNacimiento || null,
        sexo: sexo || 'otro',
        padre: padre || null,
        madre: madre || null
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!personaActualizada) {
      return res.status(404).send('Persona no encontrada.');
    }

    res.redirect('/personas');
  } catch (error) {
    console.error('Error al actualizar persona:', error);
    res.status(400).send(
      'No se pudo actualizar la persona. Verifica los datos.'
    );
  }
});

// Eliminar una persona

 // Eliminar una persona y limpiar sus referencias familiares
app.post('/personas/:id/eliminar', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar el identificador
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).send(
        'El identificador de la persona no es válido.'
      );
    }

    // Buscar la persona
    const persona = await Persona.findById(id);

    if (!persona) {
      return res.status(404).send('Persona no encontrada.');
    }

    // Quitar la referencia de padre o madre en los hijos registrados.
    // Los hijos se conservan en la base de datos.
    await Persona.updateMany(
      { padre: persona._id },
      { $set: { padre: null } }
    );

    await Persona.updateMany(
      { madre: persona._id },
      { $set: { madre: null } }
    );

    // Eliminar la persona seleccionada
    await Persona.findByIdAndDelete(id);

    return res.redirect('/personas');
  } catch (error) {
    console.error('Error al eliminar persona:', error);
    return res.status(500).send(
      'No se pudo eliminar la persona. Inténtalo nuevamente.'
    );
  }
});


// Consultar familia hasta segundo grado
app.get('/personas/:id/familia', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).send('El identificador de la persona no es válido.');
    }

    const persona = await Persona.findById(req.params.id)
      .populate('padre')
      .populate('madre');

    if (!persona) {
      return res.status(404).send('Persona no encontrada.');
    }

    const primerGrado = {
      padres: [persona.padre, persona.madre].filter(Boolean),
      hijos: await Persona.find({
        $or: [
          { padre: persona._id },
          { madre: persona._id }
        ]
      }).sort({ apellidos: 1, nombres: 1 })
    };

    // Hermanos: personas que comparten al menos un padre o una madre
    const condicionesHermanos = [];

    if (persona.padre) {
      condicionesHermanos.push({ padre: persona.padre._id });
    }

    if (persona.madre) {
      condicionesHermanos.push({ madre: persona.madre._id });
    }

    let hermanos = [];

    if (condicionesHermanos.length > 0) {
      hermanos = await Persona.find({
        _id: { $ne: persona._id },
        $or: condicionesHermanos
      }).sort({ apellidos: 1, nombres: 1 });
    }

    // Abuelos: padres del padre y de la madre
    const padresIds = [persona.padre?._id, persona.madre?._id].filter(Boolean);

    const padresDePadres = padresIds.length
      ? await Persona.find({ _id: { $in: padresIds } })
          .populate('padre')
          .populate('madre')
      : [];

    const abuelos = [];

    for (const familiar of padresDePadres) {
      if (familiar.padre) abuelos.push(familiar.padre);
      if (familiar.madre) abuelos.push(familiar.madre);
    }

    // Nietos: hijos de los hijos de la persona
    const hijosIds = primerGrado.hijos.map(hijo => hijo._id);

    const nietos = hijosIds.length
      ? await Persona.find({
          $or: [
            { padre: { $in: hijosIds } },
            { madre: { $in: hijosIds } }
          ]
        }).sort({ apellidos: 1, nombres: 1 })
      : [];

    const segundoGrado = {
      hermanos,
      abuelos,
      nietos
    };

    res.render('familia', {
      persona,
      primerGrado,
      segundoGrado
    });
  } catch (error) {
    console.error('Error al consultar árbol familiar:', error);
    res.status(500).send('Error al consultar el árbol familiar.');
  }
});

// Estado del servidor y de MongoDB
app.get('/health', (req, res) => {
  res.status(200).json({
    servidor: 'activo',
    baseDatos: mongoose.connection.readyState === 1
      ? 'conectada'
      : 'desconectada'
  });
});

// API CRUD: /api/personas
app.use('/api/personas', personaRoutes);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).send('Página o recurso no encontrado.');
});

// Iniciar servidor después de conectar con MongoDB
async function iniciarServidor() {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        'Falta configurar MONGODB_URI en el archivo .env'
      );
    }

    await mongoose.connect(mongoUri);

    console.log('MongoDB Atlas conectado correctamente.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor activo en http://localhost:${PORT}`);
      console.log(`Personas: http://localhost:${PORT}/personas`);
      console.log(`Estado: http://localhost:${PORT}/health`);
      console.log(`API: http://localhost:${PORT}/api/personas`);
    });
  } catch (error) {
    console.error('No se pudo iniciar la aplicación:', error.message);
    process.exit(1);
  }
}

iniciarServidor();
