module.exports = {
  apps: [{
    name: "lillys",
    script: "node_modules/.bin/next",
    args: "start -p 3003",
    cwd: "/opt/lillys",
    env: { NODE_ENV: "production", PORT: "3003" },
    restart_delay: 3000,
    max_restarts: 10,
  }]
};
