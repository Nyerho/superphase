const REQUIRED_KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

export function onRequestGet({ env }) {
  if (REQUIRED_KEYS.some((key) => !env[key])) {
    return Response.json(
      { error: 'Account services are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const config = {
    apiKey: env.FIREBASE_API_KEY,
    authDomain: env.FIREBASE_AUTH_DOMAIN,
    projectId: env.FIREBASE_PROJECT_ID,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
    appId: env.FIREBASE_APP_ID
  };

  if (env.FIREBASE_MEASUREMENT_ID) {
    config.measurementId = env.FIREBASE_MEASUREMENT_ID;
  }

  return Response.json(config, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=300'
    }
  });
}

export function onRequest(context) {
  if (context.request.method !== 'GET') {
    return Response.json(
      { error: 'Method not allowed.' },
      { status: 405, headers: { Allow: 'GET' } }
    );
  }
  return onRequestGet(context);
}
