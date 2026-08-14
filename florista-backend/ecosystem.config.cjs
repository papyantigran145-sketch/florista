module.exports = {
  apps: [{
    name: 'florista-backend',
    script: 'server.js',
    instances: 1,
    node_args: '--max-old-space-size=512',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
