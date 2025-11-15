const Hapi = require('@hapi/hapi');
const notes = require('./api/notes');
const NotesService = require('./services/inMemory/NotesService');
const NotesValidator = require('./validator/notes');


const init = async () => {
  const notesService = new NotesService();
  const server = Hapi.server({
    port: 3000,
    host: process.env.NODE_ENV !== 'production' ? 'localhost' : '0.0.0.0',
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  await server.register({
    plugin: notes,
    options: {
      service: notesService,
      validator: NotesValidator,
    },
  });

  // Normalize Boom / Hapi error responses so tests receive consistent shape
  // (e.g. payload parse errors return a Boom 400 before reaching handlers)
  server.ext('onPreResponse', (request, h) => {
    const response = request.response;

    // If Hapi generated an error (Boom), convert it to our API error shape
    if (response && response.isBoom) {
      const statusCode = response.output && response.output.statusCode ? response.output.statusCode : 500;
      const message = response.message || (response.output && response.output.payload && response.output.payload.message) || 'Terjadi kegagalan pada server.';

      if (statusCode >= 400 && statusCode < 500) {
        return h.response({ status: 'fail', message }).code(statusCode);
      }

      return h.response({ status: 'error', message: 'Maaf, terjadi kegagalan pada server kami.' }).code(500);
    }

    return h.continue;
  });

  console.log('Routes:', server.table().map((r) => `${r.method.toUpperCase()} ${r.path}`));

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();