let cachedServer;

module.exports = async (req, res) => {
  if (!cachedServer) {
    const { createApp } = require('../dist/create-app');
    const app = await createApp();
    cachedServer = app.getHttpAdapter().getInstance();
  }

  return cachedServer(req, res);
};
