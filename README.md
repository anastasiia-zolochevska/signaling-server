# Signaling server

[![Deploy to Azure](http://azuredeploy.net/deploybutton.png)](https://azuredeploy.net/)

Http/https [signaling server](https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/) for [WebRTC](https://webrtc.org/)  communication

## Run locally
Simply run
```bash
npm install
node .\server.js
```

By default server will run on port `3000` locally. Set environment variable `PORT` to change it.

## Deploy to Azure

Simply click the big button above :smile:

> Note: This application ships with CORS wide open (`*`, set below). Anytime `CORS_ORIGINS` contains `*` as a value, or if
it contains no values, any caller will be able to access your service. 

You can set the origins that should be allowed to make cross-origin calls to your service by adding comma seperated values to the `CORS_ORIGINS` environment variable.

## Logging

If environment variable APPINSIGHTS_INSTRUMENTATIONKEY is set, logs are available in [Application Insights](https://docs.microsoft.com/en-us/azure/application-insights/app-insights-nodejs).

## Authentication
Authentication with [Azure Active Directory B2C](https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-overview) is comming soon.
