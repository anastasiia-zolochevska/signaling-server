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

## Timeouts

Since this server expects a client to use http long polling to request data that the server doesn't yet have, TCP timeouts are a common
occurence. When a timeout occurs, the client is expected to simply recognize that the TCP session has ended due to a timeout, and reconnect.

However, when running this server on azure, the server may send an http `500` response, instead of simply timing out the socket. This
is an implementation issue of the azure component that handles node applications. As a result, __if you're using this server on azure, you
must make your client capable of treating http `500` responses as if the socket has timed out__. We do this [in our client](https://github.com/CatalystCode/3dtoolkit/pull/46/commits/47d03694baecc5a70902545d1e4db8c7dab6ba91).

## Logging

If environment variable APPINSIGHTS_INSTRUMENTATIONKEY is set, logs are available in [Application Insights](https://docs.microsoft.com/en-us/azure/application-insights/app-insights-nodejs).

## Authentication
Authentication with [Azure Active Directory B2C](https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-overview) is comming soon.

## Custom HTTPS certificates

You can configure this server to use a custom SSL certificate at the platform level (azure, heroku, aws, etc) - to learn how to do so on azure,
see [this page](https://docs.microsoft.com/en-us/azure/app-service-web/web-sites-purchase-ssl-web-site).
