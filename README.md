# Signaling server

[Signaling server](https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/) for [WebRTC](https://webrtc.org/) 

## Run locally
Simply run
```bash
npm install
node .\server.js
```

Be default it will run server on port 3000. Set environment variable PORT to change it.

## Deploy to Azure
Azure Web Apps provides a highly scalable, self-patching web hosting service. [This quickstart](https://docs.microsoft.com/en-us/azure/app-service-web/app-service-web-get-started-nodejs) shows how to deploy a Node.js app to Azure Web Apps

## Logging
If environment variable APPINSIGHTS_INSTRUMENTATIONKEY is set, logs are available in [Application Insights](https://docs.microsoft.com/en-us/azure/application-insights/app-insights-nodejs)
