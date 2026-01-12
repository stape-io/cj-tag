const BigQuery = require('BigQuery');
const encodeUriComponent = require('encodeUriComponent');
const getAllEventData = require('getAllEventData');
const getContainerVersion = require('getContainerVersion');
const getCookieValues = require('getCookieValues');
const getRequestHeader = require('getRequestHeader');
const getTimestampMillis = require('getTimestampMillis');
const getType = require('getType');
const JSON = require('JSON');
const logToConsole = require('logToConsole');
const makeString = require('makeString');
const makeTableMap = require('makeTableMap');
const parseUrl = require('parseUrl');
const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();

if (!isConsentGivenOrNotRequired()) {
  return data.gtmOnSuccess();
}

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
        'max-age': 86400 * 395
      };

      setCookie('cje', value, options, false);
    }
  }

  return data.gtmOnSuccess();
} else {
  const requestUrl = getRequestUrl();

  log({
    Name: 'CJ',
    Type: 'Request',
    EventName: 'Conversion',
    RequestMethod: 'GET',
    RequestUrl: requestUrl
  });

  sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      log({
        Name: 'CJ',
        Type: 'Response',
        EventName: 'Conversion',
        ResponseStatusCode: statusCode,
        ResponseHeaders: headers,
        ResponseBody: body
      });
      if (!data.useOptimisticScenario) {
        if (statusCode >= 200 && statusCode < 300) {
          data.gtmOnSuccess();
        } else {
          data.gtmOnFailure();
        }
      }
    },
    { method: 'GET' }
  );

  if (data.useOptimisticScenario) {
    return data.gtmOnSuccess();
  }
}

/*==============================================================================
VENDOR RELATED FUNCTIONS
==============================================================================*/

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
    data.orderId || eventData.orderId || eventData.order_id || eventData.transaction_id;
  if (orderId) {
    requestUrl = requestUrl + '&OID=' + enc(orderId);
  }
  // CJ currency
  const currency = data.currencyCode || eventData.currencyCode || eventData.currency;
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
    const itemKeys = makeTableMap(data.itemKeys || [], 'key', 'value') || {};
    const itemIdKey = itemKeys.item_id || 'item_id';
    const itemPriceKey = data.price || 'price';
    const itemQuantityKey = data.quantity || 'quantity';
    const itemDiscountKey = data.discount || 'discount';
    items
      .filter((item) => item && item[itemIdKey])
      .forEach((item, index) => {
        const x = index + 1;
        requestUrl = requestUrl + '&ITEM' + x + '=' + enc(item[itemIdKey]);
        requestUrl = requestUrl + '&AMT' + x + '=' + enc(item[itemPriceKey] || 0);
        requestUrl = requestUrl + '&QTY' + x + '=' + enc(item[itemQuantityKey] || 1);
        requestUrl = requestUrl + '&DCNT' + x + '=' + enc(item[itemDiscountKey] || 0);
      });
  }
  // CJ customer status
  const customerStatus = data.customerStatus || eventData.customerStatus;
  if (customerStatus) {
    requestUrl = requestUrl + '&CUST_STATUS=' + enc(customerStatus);
  }
  if (data.amount) {
    requestUrl = requestUrl + '&amount=' + enc(data.amount);
  }
  requestUrl = requestUrl + '&trackingSource=stapeio';
  return requestUrl;
}

/*==============================================================================
HELPERS
==============================================================================*/

function enc(data) {
  if (['null', 'undefined'].indexOf(getType(data)) !== -1) data = '';
  return encodeUriComponent(makeString(data));
}

function log(rawDataToLog) {
  const logDestinationsHandlers = {};
  if (determinateIsLoggingEnabled()) logDestinationsHandlers.console = logConsole;
  if (determinateIsLoggingEnabledForBigQuery()) logDestinationsHandlers.bigQuery = logToBigQuery;

  rawDataToLog.TraceId = getRequestHeader('trace-id');

  const keyMappings = {
    // No transformation for Console is needed.
    bigQuery: {
      Name: 'tag_name',
      Type: 'type',
      TraceId: 'trace_id',
      EventName: 'event_name',
      RequestMethod: 'request_method',
      RequestUrl: 'request_url',
      RequestBody: 'request_body',
      ResponseStatusCode: 'response_status_code',
      ResponseHeaders: 'response_headers',
      ResponseBody: 'response_body'
    }
  };

  for (const logDestination in logDestinationsHandlers) {
    const handler = logDestinationsHandlers[logDestination];
    if (!handler) continue;

    const mapping = keyMappings[logDestination];
    const dataToLog = mapping ? {} : rawDataToLog;

    if (mapping) {
      for (const key in rawDataToLog) {
        const mappedKey = mapping[key] || key;
        dataToLog[mappedKey] = rawDataToLog[key];
      }
    }

    handler(dataToLog);
  }
}

function logConsole(dataToLog) {
  logToConsole(JSON.stringify(dataToLog));
}

function logToBigQuery(dataToLog) {
  const connectionInfo = {
    projectId: data.logBigQueryProjectId,
    datasetId: data.logBigQueryDatasetId,
    tableId: data.logBigQueryTableId
  };
  dataToLog.timestamp = getTimestampMillis();

  ['request_body', 'response_headers', 'response_body'].forEach((p) => {
    dataToLog[p] = JSON.stringify(dataToLog[p]);
  });
  BigQuery.insert(connectionInfo, [dataToLog], { ignoreUnknownValues: true });
}

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = !!(
    containerVersion &&
    (containerVersion.debugMode || containerVersion.previewMode)
  );

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

function determinateIsLoggingEnabledForBigQuery() {
  if (data.bigQueryLogType === 'no') return false;
  return data.bigQueryLogType === 'always';
}

function isConsentGivenOrNotRequired() {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}
