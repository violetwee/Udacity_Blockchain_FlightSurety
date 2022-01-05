
import http from 'http'
import app from './server'

const server = http.createServer(app)
let currentApp = app

const PORT = 3000;
const HOSTNAME = "127.0.0.1";

server.listen(PORT, HOSTNAME, () => {
  console.log(`Oracle server running at http://${HOSTNAME}:${PORT}/`);
})

if (module.hot) {
  module.hot.accept('./server', () => {
    server.removeListener('request', currentApp)
    server.on('request', app)
    currentApp = app
  })
}
