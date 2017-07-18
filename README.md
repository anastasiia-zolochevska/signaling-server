# Signaling server

Http/https [signaling server](https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/) for [WebRTC](https://webrtc.org/)  communication

## Run locally
Simply run
```bash
npm install
node .\server.js
```

By default server will run on port 3000. Set environment variable PORT to change it.

## Deploy to Azure
Azure Web Apps provides a highly scalable, self-patching web hosting service. [This quickstart](https://docs.microsoft.com/en-us/azure/app-service-web/app-service-web-get-started-nodejs) shows how to deploy a Node.js app to Azure Web Apps.

Set environmant variable (application setting) WEBSITE_NODE_DEFAULT_VERSION to "8.0.0"

## Logging
If environment variable APPINSIGHTS_INSTRUMENTATIONKEY is set, logs are available in [Application Insights](https://docs.microsoft.com/en-us/azure/application-insights/app-insights-nodejs).

## Authentication
Authentication with [Azure Active Directory B2C](https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-overview) is comming soon.
