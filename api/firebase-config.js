const REQUIRED_KEYS = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

module.exports = function firebaseConfigHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (REQUIRED_KEYS.some((key) => !process.env[key])) {
    return res.status(503).json({ error: 'Firebase configuration is unavailable.' });
  }

  const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };

  if (process.env.FIREBASE_MEASUREMENT_ID) {
    config.measurementId = process.env.FIREBASE_MEASUREMENT_ID;
  }

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  return res.status(200).json(config);
};
