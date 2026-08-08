import { createRepository } from '../dataAccess/repository.js';

export async function listDecorations() {
  const repository = createRepository('decorations');
  const decorations = await repository.list();
  return {
    statusCode: 200,
    body: { decorations },
  };
}

export async function getDecoration({ params }) {
  const repository = createRepository('decorations');
  const decoration = await repository.getById(params[0]);
  if (!decoration) {
    return {
      statusCode: 404,
      body: { error: 'Decoration not found.' },
    };
  }

  return {
    statusCode: 200,
    body: { decoration },
  };
}
