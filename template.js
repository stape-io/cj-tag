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
  const eventTime =
    data.conversionDateTime ||
    eventData.conversionDateTime ||
    convertTimestampToISO(getTimestampMillis());
  requestUrl = requestUrl + '&EVENTTIME=' + enc(eventTime);
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

function convertTimestampToISO(timestamp) {
  const secToMs = function (s) {
    return s * 1000;
  };
  const minToMs = function (m) {
    return m * secToMs(60);
  };
  const hoursToMs = function (h) {
    return h * minToMs(60);
  };
  const daysToMs = function (d) {
    return d * hoursToMs(24);
  };
  const format = function (value) {
    return value >= 10 ? value.toString() : '0' + value;
  };
  const fourYearsInMs = daysToMs(365 * 4 + 1);
  let year = 1970 + Math.floor(timestamp / fourYearsInMs) * 4;
  timestamp = timestamp % fourYearsInMs;

  while (true) {
    let isLeapYear = !(year % 4);
    let nextTimestamp = timestamp - daysToMs(isLeapYear ? 366 : 365);
    if (nextTimestamp < 0) {
      break;
    }
    timestamp = nextTimestamp;
    year = year + 1;
  }

  const daysByMonth =
    year % 4 === 0
      ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let month = 0;
  for (let i = 0; i < daysByMonth.length; i++) {
    let msInThisMonth = daysToMs(daysByMonth[i]);
    if (timestamp > msInThisMonth) {
      timestamp = timestamp - msInThisMonth;
    } else {
      month = i + 1;
      break;
    }
  }
  let date = Math.ceil(timestamp / daysToMs(1));
  timestamp = timestamp - daysToMs(date - 1);
  let hours = Math.floor(timestamp / hoursToMs(1));
  timestamp = timestamp - hoursToMs(hours);
  let minutes = Math.floor(timestamp / minToMs(1));
  timestamp = timestamp - minToMs(minutes);
  let sec = Math.floor(timestamp / secToMs(1));

  return (
    year +
    '-' +
    format(month) +
    '-' +
    format(date) +
    'T' +
    format(hours) +
    ':' +
    format(minutes) +
    ':' +
    format(sec) +
    '+00:00'
  );
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
