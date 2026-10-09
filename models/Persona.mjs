import mongoose from 'mongoose';

const personaSchema = new mongoose.Schema(
  {
    nombres: {
      type: String,
      required: true,
      trim: true
    },
    apellidos: {
      type: String,
      required: true,
      trim: true
    },
    fechaNacimiento: {
      type: Date,
      default: null
    },
    sexo: {
      type: String,
      enum: ['masculino', 'femenino', 'otro'],
      default: 'otro'
    },
    padre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      default: null
    },
    madre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model('Persona', personaSchema);