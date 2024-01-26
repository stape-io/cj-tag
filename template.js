const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');
const parseUrl = require('parseUrl');
const JSON = require('JSON');
const getRequestHeader = require('getRequestHeader');
const encodeUriComponent = require('encodeUriComponent');
const getCookieValues = require('getCookieValues');
const getAllEventData = require('getAllEventData');
const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const getTimestampMillis = require('getTimestampMillis');
const makeString = require('makeString');
const getType = require('getType');
const Math = require('Math');

const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');
const eventData = getAllEventData();

if (data.type === 'page_view') {
  const url = eventData.page_location || getRequestHeader('referer');

  if (url) {
    const value = parseUrl(url).searchParams[data.clickIdParameterName];

    if (value) {
      const options = {
        domain: 'auto',
        path: '/',
        secure: true,
        httpOnly: false,
        expiration: 86400 * 395
      };

      setCookie('cje', value, options, false);
    }
  }

  data.gtmOnSuccess();
} else {
  const requestUrl = getRequestUrl();

  if (isLoggingEnabled) {
    logToConsole(
      JSON.stringify({
        Name: 'CJ',
        Type: 'Request',
        TraceId: traceId,
        EventName: 'Conversion',
        RequestMethod: 'GET',
        RequestUrl: requestUrl
      })
    );
  }

  sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      if (isLoggingEnabled) {
        logToConsole(
          JSON.stringify({
            Name: 'CJ',
            Type: 'Response',
            TraceId: traceId,
            EventName: 'Conversion',
            ResponseStatusCode: statusCode,
            ResponseHeaders: headers,
            ResponseBody: body
          })
        );
      }

      if (statusCode >= 200 && statusCode < 300) {
        data.gtmOnSuccess();
      } else {
        data.gtmOnFailure();
      }
    },
    { method: 'GET' }
  );
}

function getRequestUrl() {
  // CJ assigned ID for your program
  let requestUrl = 'https://www.emjcd.com/u?CID=' + enc(data.cid);
  // CJ event type
  requestUrl = requestUrl + '&TYPE=' + enc(data.actionId);
  // CJ method
  requestUrl = requestUrl + '&METHOD=S2S';
  // CJ event ID
  const CJEVENT = getCookieValues('cje')[0] || '';
  if (CJEVENT) {
    requestUrl = requestUrl + '&CJEVENT=' + enc(CJEVENT);
  }
  // CJ event time
  const eventTime = data.conversionDateTime || eventData.conversionDateTime;
  if (eventTime) {
    requestUrl = requestUrl + '&EVENTTIME=' + enc(eventTime);
  }
  // CJ order ID
  const orderId =
    data.orderId ||
    eventData.orderId ||
    eventData.order_id ||
    eventData.transaction_id;
  if (orderId) {
    requestUrl = requestUrl + '&OID=' + enc(orderId);
  }
  // CJ currency
  const currency =
    data.currencyCode || eventData.currencyCode || eventData.currency;
  if (currency) {
    requestUrl = requestUrl + '&CURRENCY=' + enc(currency);
  }
  // CJ coupon
  const coupon = data.coupon || eventData.coupon;
  if (coupon) {
    requestUrl = requestUrl + '&COUPON=' + enc(coupon);
  }
  // CJ discount
  const discount = data.discount || eventData.discount;
  if (discount) {
    requestUrl = requestUrl + '&DISCOUNT=' + enc(discount);
  }
  // CJ ITEMx, AMTx, QTYx, DCNTx
  const items = data.items || eventData.items || [];
  if (getType(items) === 'array') {
    const itemIdKey = data.itemIdKey || 'id';
    const itemPriceKey = data.itemPriceKey || 'price';
    const itemQuantityKey = data.itemQuantityKey || 'quantity';
    const itemDiscountKey = data.itemDiscountKey || 'discount';
    items
      .filter((item) => item && item.id)
      .forEach((item, index) => {
        const x = index + 1;
        requestUrl = requestUrl + '&ITEM' + x + '=' + enc(item[itemIdKey]);
        requestUrl =
          requestUrl + '&AMT' + x + '=' + enc(item[itemPriceKey] || 0);
        requestUrl =
          requestUrl + '&QTY' + x + '=' + enc(item[itemQuantityKey] || 1);
        requestUrl =
          requestUrl + '&DCNT' + x + '=' + enc(item[itemDiscountKey] || 0);
      });
  }
  // CJ customer status
  const customerStatus = data.customerStatus || eventData.customerStatus;
  if (customerStatus) {
    requestUrl = requestUrl + '&CUST_STATUS=' + enc(customerStatus);
  }
  return requestUrl;
}

function enc(data) {
  data = data || '';
  return encodeUriComponent(makeString(data));
}

function determinateIsLoggingEnabled() {
  if (!data.logType) {
    return isDebug;
  }

  if (data.logType === 'no') {
    return false;
  }

  if (data.logType === 'debug') {
    return isDebug;
  }

  return data.logType === 'always';
}
