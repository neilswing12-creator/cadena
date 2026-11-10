// pm2 process for PisoScan in production. Start with: pm2 start deploy/ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: "cadena",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3470 -H 127.0.0.1",
      env: { NODE_ENV: "production" },
      uid: "cadena",
      gid: "cadena",
      max_memory_restart: "900M",
      time: true,
    },
  ],
};
