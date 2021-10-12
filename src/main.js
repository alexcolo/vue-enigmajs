import { createApp } from 'vue'
import App from './App.vue'

import enigma from "enigma.js";
import schema from "enigma.js/schemas/12.936.0.json";
import senseUtilities from "enigma.js/sense-utilities";

createApp(App).mount('#app')

const serverRef = {
    "main": {
    "secure": false,
    "host": "qmi-qs-aa7a",
    "port": "",
    "prefix": ""
    }
};

let enigmaConn = getEnigmaConn(serverRef);

async function getEnigmaConn(serverRef) {
    
      let { secure, host, port, prefix } = serverRef.main;

      const hrefBase = `http${secure ? "s" : ""}://${host}${
        port ? `:${port}` : ""
      }${prefix}`;

    
      let urlConfig = {}

      //Get qlik ticket if present
      const urlParams = new URLSearchParams(window.location.search);
      const qlikTicket = urlParams.get('qlikTicket');
      console.log('qlikTicket', qlikTicket);

      //Check if I have qlikTicket
      if(!qlikTicket) {
        urlConfig = {
          host: host, 
          port: port,
          // appId: '123',
          secure: secure,
          prefix: prefix,
          urlParams: {reloadUri: "http://localhost:8080"}
        }
      }
      //Otherwise I'll add my valid ticket to my websocket url
      else {
        urlConfig = {
          host: host, 
          port: port,
          // appId: '123',
          secure: secure,
          prefix: prefix,
          urlParams: {
            reloadUri: "http://localhost:8080",
            qlikTicket: qlikTicket
          }
        };
      }
  
      let session = null;
      let global = null;
      let engineVersion = null;
  
      if (!host) {
        console.error(
          `[${serverRef}] host and prefix are required arguments to create a Qlik Sense session`,
          { serverRef, host, port, prefix, secure }
        );
        return { session, engineVersion };
      }
  
      session = await enigma.create({
        schema,
        url: senseUtilities.buildUrl(urlConfig),
      });
  
      // bind events to log activity on the socket:
      session.on("notification:*", (eventName, data) => {
        console.debug(`[${serverRef}] ${eventName}:`, data);
        
        // if need login, redirect to login page
        if (data.mustAuthenticate === true) {
            console.log("Need authentication");

            window.location.href = data.loginUri;
        }
      });
      session.on("traffic:sent", data =>
        console.debug(`[${serverRef}] sent:`, data)
      );
      session.on("traffic:received", data =>
        console.debug(`[${serverRef}] received:`, data)
      );
      session.on("closed", () =>
        console.log('Session closed')
      );
  
      try {
        global = await session.open();
        const engineVersionObject = await global.engineVersion();
        engineVersion = engineVersionObject.qComponentVersion;
        console.log(`engineVersion: ${engineVersion}`);
      } catch (error) {
        console.error(
          `[${serverRef}] Connection to ${host} could not be established`,
          { error }
        );
      }
      enigmaConn = { session, global, engineVersion, hrefBase };

      const closeSession = await session.close();
      console.log('Close Session', closeSession);
    //   actions.setEnigmaConnection(serverRef, enigmaConn);
    // }
    return enigmaConn;
  }

